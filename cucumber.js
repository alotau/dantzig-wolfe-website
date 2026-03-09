export default {
  default: {
    paths: ['features/**/*.feature'],
    import: ['tests/acceptance/step-definitions/**/*.ts', 'tests/acceptance/support/*.ts'],
    loader: ['tsx'],
    format: ['html:reports/cucumber-report.html', 'summary'],
  },
}
