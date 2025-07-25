import fs from 'fs'

describe('Basic UI', () => {
  it('should create a graph and run it', () => {
    cy.visit('http://localhost:3000')

    // add a start node
    cy.get('[data-testid="authoring-view"]').rightclick('left')
    cy.get('[data-testid="node-picker-search"]').type('event/onStart')
    cy.get('[data-testid="node-picker-event/onStart"]').click()

    // switch to log engine mode
    cy.get('[data-testid="engine-selector"] ul li').first().click()

    // play the graph
    cy.get('[data-testid="logging-engine-play-btn"]').click()

    // check the log
    const expectedLog = '\nAdding {"node":0,"socket":"start"} flow to queue\nRunning OnStart: input values: {}, output flows: {"out":{}}'
    cy.get('[data-testid="logging-engine-log"]').invoke('text').should('equal', expectedLog)
  })


  it('should upload a glb file and play it', () => {
    cy.visit('http://localhost:3000')

    // uplaod test glb file
    cy.get('[data-testid="babylon-engine-file-input"]').selectFile('cypress/assets/rot_cube.glb', {force: true})

    cy.wait(250)

    cy.get('[data-testid="babylon-engine-canvas"]').scrollIntoView()
    cy.get('[data-testid="frame-btn"]').click({force: true})

    cy.wait(2000)

    cy.get('[data-testid="babylon-engine-canvas"]').toMatchImageSnapshot({
      imageConfig: {
        threshold: 0.01,
      },
      name: "rot-cube-before-click"
    })

    cy.get('[data-testid="babylon-engine-canvas"]').click()

    cy.wait(1000)

    cy.get('[data-testid="babylon-engine-canvas"]').toMatchImageSnapshot({
      imageConfig: {
        threshold: 0.01,
      },
      name: "rot-cube-after-click"
    })
  })

  it("MathTests", () => {
    cy.visit('http://localhost:3000')

     // uplaod test glb file
     cy.get('[data-testid="babylon-engine-file-input"]').selectFile('cypress/assets/MathTests.glb', {force: true})

     cy.wait(250)

     cy.get('[data-testid="babylon-engine-canvas"]').scrollIntoView()

     cy.wait(2000)

     cy.get('[data-testid="babylon-engine-canvas"]').toMatchImageSnapshot({
       imageConfig: {
         threshold: 0.01,
       },
       name: "MathTests"
     })
  })

  describe('matrix tests', () => {
    it("FromWorldToWorldTests", () => {
      cy.visit('http://localhost:3000')

      // uplaod test glb file
      cy.get('[data-testid="babylon-engine-file-input"]').selectFile('cypress/assets/matrix/FromWorldToWorldTests.glb', {force: true})

      cy.wait(250)

      cy.get('[data-testid="babylon-engine-canvas"]').scrollIntoView()
      cy.get('[data-testid="frame-btn"]').click({force: true})

      cy.wait(2000)

      cy.get('[data-testid="babylon-engine-canvas"]').toMatchImageSnapshot({
        imageConfig: {
          threshold: 0.01,
        },
        name: "FromWorldToWorldTests"
      })

    }),
    it("MatrixTest_ComposeDecompose", () => {
      cy.visit('http://localhost:3000')

      // uplaod test glb file
      cy.get('[data-testid="babylon-engine-file-input"]').selectFile('cypress/assets/matrix/MatrixTest_ComposeDecompose.glb', {force: true})

      cy.wait(250)

      cy.get('[data-testid="babylon-engine-canvas"]').scrollIntoView()
      cy.get('[data-testid="frame-btn"]').click({force: true})

      cy.wait(2000)

      cy.get('[data-testid="babylon-engine-canvas"]').toMatchImageSnapshot({
        imageConfig: {
          threshold: 0.01,
        },
        name: "MatrixTest_ComposeDecompose"
      })

    }),
    it("MatrixTest_GlobalMatrix_Decompose-Compose-Decompose", () => {
      cy.visit('http://localhost:3000')

      // uplaod test glb file
      cy.get('[data-testid="babylon-engine-file-input"]').selectFile('cypress/assets/matrix/MatrixTest_GlobalMatrix_Decompose-Compose-Decompose.glb', {force: true})

      cy.wait(250)

      cy.get('[data-testid="babylon-engine-canvas"]').scrollIntoView()
      cy.get('[data-testid="frame-btn"]').click({force: true})

      cy.wait(2000)

      cy.get('[data-testid="babylon-engine-canvas"]').toMatchImageSnapshot({
        imageConfig: {
          threshold: 0.01,
        },
        name: "MatrixTest_GlobalMatrix_Decompose-Compose-Decompose"
      })

    })
  })
})