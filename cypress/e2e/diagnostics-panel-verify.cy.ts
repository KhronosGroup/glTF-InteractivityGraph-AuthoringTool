describe('Diagnostics panel visibility (manual verification)', () => {
  it('shows the panel and counter when a node has a live missing-value warning', () => {
    cy.visit('http://localhost:3000')

    // sanity: panel must not be visible before any warning exists
    cy.get('[data-testid="diagnostics-panel"]').should('not.exist')

    // add a math/add node - its "a"/"b" inputs default to an unset value, which should
    // immediately trigger a "Missing value" live warning on that node
    cy.get('[data-testid="authoring-view"]').rightclick('left')
    cy.get('[data-testid="node-picker-search"]').type('math/add')
    cy.get('[data-testid="node-picker-math/add"]').click()

    cy.get('[data-testid="diagnostics-panel"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="diagnostics-panel"]').contains('warning')
    cy.get('.graph-diagnostics-counter').should('be.visible')
    cy.get('.diagnostics-counter-chip--warning').should('be.visible')

    cy.screenshot('diagnostics-panel-visible')
  })
})
