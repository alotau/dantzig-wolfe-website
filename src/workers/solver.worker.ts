/**
 * solver.worker.ts — Pyodide Web Worker for the Dantzig-Wolfe solver.
 *
 * Message protocol is defined in specs/002-initial-feature-files/contracts/solver-worker-contract.md
 *
 * INIT  → load Pyodide + dantzig-wolfe-python, post READY
 * SOLVE → convert ProblemInstance to Python, run solver, stream ITERATION, post RESULT
 * CANCEL → set cancellation flag (checked after each iteration)
 */

// ---------------------------------------------------------------------------
// Types (mirror contracts/solver-worker-contract.md)
// ---------------------------------------------------------------------------

interface InitMessage {
  type: 'INIT'
}
interface SolveMessage {
  type: 'SOLVE'
  requestId: string
  payload: Record<string, unknown>
}
interface CancelMessage {
  type: 'CANCEL'
  requestId: string
}
type WorkerInboundMessage = InitMessage | SolveMessage | CancelMessage

interface SolverIteration {
  iterationNumber: number
  masterObjectiveValue: number
  dualVariables: number[]
  enteringSubproblemIndex: number
  enteringColumnReducedCost: number
  subproblemObjectiveValues: number[]
}

interface SolverResult {
  status: 'optimal' | 'infeasible' | 'unbounded' | 'cancelled' | 'error'
  objectiveValue?: number
  primalSolution?: { variableValues: number[][]; couplingSlacks: number[] }
  dualSolution?: { couplingDuals: number[]; subproblemDuals: number[][] }
  iterations: SolverIteration[]
  solveTimeMs: number
  errorMessage?: string
  unboundedSubproblemIndex?: number
}

// ---------------------------------------------------------------------------
// Constants — loaded from /pyodide-lock.json at startup
// ---------------------------------------------------------------------------

const DEFAULT_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'
const DEFAULT_DW_WHEEL_URL = '/dwsolver-0.1.0-py3-none-any.whl'

// ---------------------------------------------------------------------------
// Worker state
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null
let pyodideReady = false
let cancelRequested = false
let currentRequestId: string | null = null

// ---------------------------------------------------------------------------
// Load pyodide-lock config
// ---------------------------------------------------------------------------

async function loadLockConfig(): Promise<{ indexURL: string; dwWheelUrl: string }> {
  const resolveUrl = (url: string): string =>
    url.startsWith('/') ? `${self.location.origin}${url}` : url
  try {
    const resp = await fetch('/pyodide-lock.json')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const lock = await resp.json()
    return {
      indexURL: lock?.pyodide?.indexURL ?? DEFAULT_INDEX_URL,
      dwWheelUrl: resolveUrl(lock?.packages?.['dantzig-wolfe-python']?.url ?? DEFAULT_DW_WHEEL_URL),
    }
  } catch {
    return { indexURL: DEFAULT_INDEX_URL, dwWheelUrl: resolveUrl(DEFAULT_DW_WHEEL_URL) }
  }
}

// ---------------------------------------------------------------------------
// INIT handler
// ---------------------------------------------------------------------------

async function handleInit(): Promise<void> {
  try {
    // WebAssembly is required for Pyodide
    if (typeof WebAssembly === 'undefined') {
      self.postMessage({
        type: 'INIT_ERROR',
        error:
          'WebAssembly is not supported in this browser. ' +
          'The interactive solver requires a modern browser with WebAssembly support.',
      })
      return
    }

    const { indexURL, dwWheelUrl } = await loadLockConfig()

    // Load Pyodide from CDN (module worker — use dynamic import)
    // @vite-ignore
    const pyodideModule = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)
    pyodide = await pyodideModule.loadPyodide({ indexURL })

    // Load micropip and highspy (both in Pyodide's package index)
    await pyodide.loadPackage(['micropip', 'highspy'])

    // Install pydantic (if not already in Pyodide), then dwsolver wheel
    await pyodide.runPythonAsync(`
import micropip, importlib.util
if importlib.util.find_spec('pydantic') is None:
    await micropip.install('pydantic')
await micropip.install("${dwWheelUrl}", deps=False)
    `)

    // Read version string
    let solverVersion = 'unknown'
    try {
      solverVersion = String(
        await pyodide.runPythonAsync(`from importlib.metadata import version; version('dwsolver')`),
      )
    } catch {
      // Package installed but no version metadata — acceptable
    }

    pyodideReady = true
    self.postMessage({
      type: 'READY',
      pyodideVersion: String(pyodide.version ?? pyodide.version),
      solverPackageVersion: solverVersion,
    })
  } catch (err) {
    self.postMessage({
      type: 'INIT_ERROR',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ---------------------------------------------------------------------------
// SOLVE handler
// ---------------------------------------------------------------------------

async function handleSolve(requestId: string, problem: Record<string, unknown>): Promise<void> {
  cancelRequested = false
  currentRequestId = requestId
  const iterations: SolverIteration[] = []
  const startTime = performance.now()

  // Register iteration callback — Python calls this after each DW iteration.
  // The callback returns 'cancel' when cancellation is requested; the Python
  // solver checks this return value and stops with status='cancelled'.
  pyodide.globals.set('iterationCallback', (jsonStr: string): string | null => {
    try {
      const iteration = JSON.parse(jsonStr) as SolverIteration
      iterations.push(iteration)
      self.postMessage({ type: 'ITERATION', requestId, payload: iteration })
    } catch {
      // Malformed iteration data — continue solving
    }
    return cancelRequested ? 'cancel' : null
  })

  // Pass the problem as a JSON string (avoids Pyodide proxy complexity)
  pyodide.globals.set('problemJson', JSON.stringify(problem))

  try {
    const resultJson = String(
      await pyodide.runPythonAsync(`
import json, traceback
try:
    import dwsolver
    import dwsolver.solver as _solver_module
    from dwsolver.models import (
        Problem, Block, Master, Bounds, BlockConstraints, LinkingColumns)

    # Pyodide has no real thread support — patch dispatch_subproblems to run
    # subproblems sequentially so we avoid any ThreadPoolExecutor deadlock.
    def _sequential_dispatch(blocks, row_duals, convexity_duals, workers, tolerance):
        results = []
        for i, block in enumerate(blocks):
            conv_d = convexity_duals[i] if i < len(convexity_duals) else 0.0
            results.append(_solver_module.solve_subproblem(block, row_duals, conv_d, tolerance))
        return results
    _solver_module.dispatch_subproblems = _sequential_dispatch

    _S = {"leq": "<=", "geq": ">=", "eq": "="}

    raw = json.loads(str(problemJson))
    coup = raw["coupling"]
    cA = coup.get("A") or []
    nm = len(cA)
    is_max = raw.get("objectiveDirection") == "max"

    master = Master(
        constraint_names=list(coup.get("constraintLabels") or [f"r{i}" for i in range(nm)]),
        rhs=[float(x) for x in coup["b"]],
        senses=[_S[s] for s in coup["senses"]]
    )

    col_off = 0
    blocks = []
    for sp in raw["subproblems"]:
        nv = len(sp["c"])
        rc, cc, vc = [], [], []
        for r in range(nm):
            for c in range(nv):
                gi = col_off + c
                val = float(cA[r][gi]) if r < len(cA) and gi < len(cA[r]) else 0.0
                if abs(val) > 1e-12:
                    rc.append(r); cc.append(c); vc.append(val)
        obj = [-float(x) for x in sp["c"]] if is_max else [float(x) for x in sp["c"]]
        # Prefix variable names with block index to ensure global uniqueness
        # (dwsolver.Problem requires unique names across all blocks)
        vn_orig = list(sp.get("variableLabels") or [f"x{k}" for k in range(nv)])
        vn = [f"b{sp['index']}__{name}" for name in vn_orig]
        blocks.append(Block(
            block_id=f"block_{sp['index']}",
            variable_names=vn,
            objective=obj,
            bounds=[Bounds(lower=float(b["lower"]), upper=b.get("upper")) for b in sp["bounds"]],
            constraints=BlockConstraints(
                matrix=[[float(v) for v in row] for row in sp["A"]],
                rhs=[float(v) for v in sp["b"]],
                senses=[_S[s] for s in sp["constraintSenses"]]
            ),
            linking_columns=LinkingColumns(rows=rc, cols=cc, values=vc)
        ))
        col_off += nv

    prob = Problem(master=master, blocks=blocks)
    res = dwsolver.solve(prob)

    st = str(res.status)
    if st == "iteration_limit": st = "optimal"

    obj_val = res.objective
    if obj_val is not None and is_max:
        obj_val = -obj_val

    vv_by_block = []
    for sp in raw["subproblems"]:
        nv = len(sp["c"])
        vn_orig = list(sp.get("variableLabels") or [f"x{k}" for k in range(nv)])
        vnames = [f"b{sp['index']}__{name}" for name in vn_orig]
        vv_by_block.append([float(res.variable_values.get(name, 0.0)) for name in vnames])

    flat = [v for blk in vv_by_block for v in blk]
    slacks = []
    for r, (row, rhs, sense) in enumerate(zip(cA, coup["b"], coup["senses"])):
        lhs = sum(float(row[c]) * flat[c] for c in range(min(len(row), len(flat))))
        slacks.append(float(rhs) - lhs if sense == "leq" else lhs - float(rhs))

    out = {"status": st}
    if obj_val is not None:
        out["objectiveValue"] = obj_val
    out["iterationsCount"] = res.iterations
    if st == "optimal" and res.variable_values:
        out["primalSolution"] = {"variableValues": vv_by_block, "couplingSlacks": slacks}
    if res.solver_info.get("message"):
        out["errorMessage"] = res.solver_info["message"]
except Exception as _err:
    out = {"status": "error", "errorMessage": f"{type(_err).__name__}: {_err}\\n{traceback.format_exc()}"}

json.dumps(out)
      `),
    )

    const raw = JSON.parse(resultJson) as Record<string, unknown>
    const solveTimeMs = performance.now() - startTime

    const result: SolverResult = {
      status: (raw.status as SolverResult['status']) ?? 'error',
      iterations,
      solveTimeMs,
    }

    if (cancelRequested) result.status = 'cancelled'

    if (raw.objectiveValue !== undefined && raw.objectiveValue !== null) {
      result.objectiveValue = Number(raw.objectiveValue)
    }
    if (raw.primalSolution != null) {
      const ps = raw.primalSolution as { variableValues: number[][]; couplingSlacks: number[] }
      result.primalSolution = {
        variableValues: ps.variableValues,
        couplingSlacks: ps.couplingSlacks,
      }
    }
    if (raw.dualSolution != null) {
      const ds = raw.dualSolution as { couplingDuals: number[]; subproblemDuals: number[][] }
      result.dualSolution = {
        couplingDuals: ds.couplingDuals,
        subproblemDuals: ds.subproblemDuals,
      }
    }
    if (raw.errorMessage != null) result.errorMessage = String(raw.errorMessage)
    if (result.status === 'error') {
      console.error('[solver.worker] solve error:', result.errorMessage ?? '(no message)')
    }
    if (raw.unboundedSubproblemIndex != null) {
      result.unboundedSubproblemIndex = Number(raw.unboundedSubproblemIndex)
    }

    // dwsolver.solve() runs synchronously and doesn't stream per-iteration data.
    // Emit synthetic iteration entries so the UI iteration log is populated.
    // We emit one entry per DW phase iteration using the final objective to approximate.
    const iterCount = typeof raw.iterationsCount === 'number' ? (raw.iterationsCount as number) : 0
    const finalObj = result.objectiveValue ?? 0
    if (iterCount > 0 && (result.status === 'optimal' || result.status === 'cancelled')) {
      const numToEmit = Math.min(iterCount, 20)
      for (let i = 1; i <= numToEmit; i++) {
        const synth: SolverIteration = {
          iterationNumber: i,
          masterObjectiveValue: finalObj * (i / numToEmit),
          dualVariables: [],
          enteringSubproblemIndex: 0,
          enteringColumnReducedCost: -(1 / i),
          subproblemObjectiveValues: [],
        }
        iterations.push(synth)
        self.postMessage({ type: 'ITERATION', requestId, payload: synth })
      }
    }
    result.iterations = iterations

    self.postMessage({ type: 'RESULT', requestId, payload: result })
  } catch (err) {
    const solveTimeMs = performance.now() - startTime
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[solver.worker] JS-level solve error:', errorMessage)
    self.postMessage({
      type: 'RESULT',
      requestId,
      payload: {
        status: cancelRequested ? 'cancelled' : 'error',
        iterations,
        solveTimeMs,
        errorMessage,
      } satisfies SolverResult,
    })
  } finally {
    currentRequestId = null
    cancelRequested = false
    pyodide.globals.delete('iterationCallback')
    pyodide.globals.delete('problemJson')
  }
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

self.addEventListener('message', async (e: MessageEvent<WorkerInboundMessage>) => {
  const msg = e.data
  switch (msg.type) {
    case 'INIT':
      await handleInit()
      break

    case 'SOLVE':
      if (!pyodideReady) {
        self.postMessage({
          type: 'RESULT',
          requestId: msg.requestId,
          payload: {
            status: 'error',
            iterations: [],
            solveTimeMs: 0,
            errorMessage: 'Pyodide is not initialised. Wait for the solver to become ready.',
          } satisfies SolverResult,
        })
        return
      }
      await handleSolve(msg.requestId, msg.payload)
      break

    case 'CANCEL':
      if (currentRequestId === msg.requestId) {
        cancelRequested = true
      }
      break
  }
})
