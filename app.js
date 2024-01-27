const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBandServer()

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'qwe45rty67uio', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//API 1

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT * FROM 
    user
    WHERE 
    username = '${username}'
    `

  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)

    if (isPasswordMatched) {
      const payload = {
        username: username,
      }

      const jwtToken = jwt.sign(payload, 'qwe45rty67uio')
      response.send({
        jwtToken: jwtToken,
      })
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//API 2

app.get('/states/', authenticateToken, async (request, response) => {
  const getStatesDetailQuery = `
   SELECT * FROM
   state;
   `
  const statesDetails = await db.all(getStatesDetailQuery)
  response.send(statesDetails)
})

//API 3

app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateDetailQuery = `
     SELECT * FROM 
     state
     WHERE state_Id = ${stateId}
   `

  const stateDetail = await db.get(getStateDetailQuery)
  response.send({
    stateId: stateDetail.state_id,
    stateName: stateDetail.state_name,
    population: stateDetail.population,
  })
})

//API 4

app.post('/districts/', authenticateToken, async (request, response) => {
  const districtDetail = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetail

  const addDistrictQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES (
     '${districtName}',
      '${stateId}',
      '${cases}',
      '${cured}',
      '${active}',
      '${deaths}'
    )
 `
  await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

//API 5

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictDetailQuery = `
     SELECT * FROM 
     district
     WHERE district_Id = ${districtId}
   `

    const districtDetail = await db.get(getDistrictDetailQuery)
    response.send({
      districtId: districtDetail.district_id,
      districtName: districtDetail.district_name,
      stateId: districtDetail.state_id,
      cases: districtDetail.cases,
      cured: districtDetail.cured,
      active: districtDetail.active,
      deaths: districtDetail.deaths,
    })
  },
)

//API 6

app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictDetailQuery = `
     DELETE FROM 
     district
     WHERE district_Id = ${districtId}
   `

    await db.run(deleteDistrictDetailQuery)
    response.send('District Removed')
  },
)

//API 7

app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const districtDetail = request.body
    const {districtName, stateId, cases, cured, active, deaths} = districtDetail

    const updateDistrictQuery = `
    UPDATE 
    district
    SET 
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    WHERE 
    district_id = '${districtId}'
 `
    await db.run(updateDistrictQuery)
    response.send('District Details Updated')
  },
)

//API 8

app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStateDetailQuery = `
     SELECT 
      SUM(cases) AS totalCases,
      SUM(cured) AS totalCured,
      SUM(active) AS totalActive,
      SUM(deaths) AS totalDeaths
     FROM 
     district
     WHERE state_Id = ${stateId}
   `

    const stateDetail = await db.get(getStateDetailQuery)
    response.send(stateDetail)
  },
)

module.exports = app
