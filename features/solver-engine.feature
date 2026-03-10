Feature: Solver Engine — Pyodide Initialisation
  As the website
  I need to load the Python solver via Pyodide in the browser
  So that all computation runs client-side without contacting a server

  Scenario: Pyodide loads successfully on a modern browser
    Given the user's browser supports WebAssembly
    When the Interactive Solver page is opened
    Then the Pyodide runtime loads completely in the browser
    And the dantzig-wolfe-python package is installed into the Pyodide environment
    And no solver-related HTTP requests are made to any compute server

  Scenario: Pyodide runtime is cached after first load
    Given the user has previously loaded the Interactive Solver in the same browser
    When the Interactive Solver page is opened again
    Then the Pyodide runtime loads from the browser cache
    And the time to solver-ready is measurably shorter than on the first load

  Scenario: Graceful error when WebAssembly is not supported
    Given the user's browser does not support WebAssembly
    When the Interactive Solver page is opened
    Then I see a clear message explaining that the solver requires a WebAssembly-capable browser
    And a list of compatible browsers is shown
    And no JavaScript errors are thrown to the console

