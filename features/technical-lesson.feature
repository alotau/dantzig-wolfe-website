Feature: Technical Lesson
  As a student learning optimization
  I want a structured, self-contained technical lesson on Dantzig-Wolfe Decomposition
  So that I can understand the algorithm deeply enough to apply or implement it

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: Navigate to the technical lesson
    When I navigate to the Lesson section
    Then I see a page titled "Dantzig-Wolfe Decomposition: A Technical Lesson"
    And the lesson is divided into numbered sections I can navigate between

  Scenario: Understand the prerequisite knowledge stated upfront
    When I navigate to the Lesson section
    Then I see a prerequisites summary at the top of the page
    And the prerequisites list familiarity with linear programming and the Simplex Method
    And each prerequisite term links to an external resource or the site glossary

  Scenario: Learn what problem structure Dantzig-Wolfe applies to
    When I read the "Problem Structure" section of the lesson
    Then I see an explanation of block-angular LP structure
    And the section shows a general block-angular LP formulation expressed as mathematical notation
    And the notation distinguishes the coupling constraints from the sub-problem constraints
    And every symbol in the formulation is defined in an accompanying legend

  Scenario: Understand the reformulation as a master problem
    When I read the "Master Problem" section of the lesson
    Then I see a derivation of the Dantzig-Wolfe master problem from the original block-angular LP
    And the derivation explains how extreme points and extreme rays of each sub-problem's feasible region are used as columns
    And the section explains the role of the convexity constraints in the master problem
    And every technical term is defined inline or linked to the glossary

  Scenario: Understand the sub-problems
    When I read the "Sub-Problems" section of the lesson
    Then I see an explanation of the pricing sub-problems
    And the section explains that each sub-problem finds a column with negative reduced cost to enter the master problem
    And the section distinguishes the bounded and unbounded cases for sub-problem solutions
    And the section explains that an unbounded sub-problem indicates the original LP is unbounded

  Scenario: Understand the column generation iteration
    When I read the "Column Generation" section of the lesson
    Then I see a step-by-step description of one complete Dantzig-Wolfe iteration
    And the steps are: solve the restricted master problem, obtain dual variables, solve each pricing sub-problem, check optimality
    And the optimality condition — all reduced costs non-negative — is stated explicitly
    And the section explains that the algorithm terminates in finite iterations under non-degeneracy

  Scenario: Understand convergence and termination
    When I read the "Convergence" section of the lesson
    Then I see an explanation of the termination criterion
    And the section notes practical issues such as degeneracy and tailing-off behaviour
    And the section mentions stabilisation strategies such as restricted master heuristics or Kelley cuts at a high level

  Scenario: Every mathematical term has a definition
    When I read any section of the lesson
    Then every mathematical term that is not universally standard notation is either defined inline or linked to the site glossary
    And the glossary entry explains the term in plain language before introducing formal notation

  Scenario: Lesson sections are independently navigable
    When I am on the Lesson page
    Then I can jump directly to any section using a table of contents
    And my position in the lesson is preserved if I navigate away and return within the same session
