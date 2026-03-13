export default {
  paths: ['features/**/*.feature'],
  import: ['tests/acceptance/step-definitions/**/*.ts', 'tests/acceptance/support/*.ts'],
  format: ['html:reports/cucumber-report.html', 'summary'],
  strict: false,
}
