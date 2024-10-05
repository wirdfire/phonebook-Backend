require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const Person = require('./models/person')

const app = express()

// Middleware
app.use(express.json()) // for parsing JSON requests
app.use(cors()) // for enabling CORS
app.use(express.static('dist'))

morgan.token('post-data', (req) => {
  return req.method === 'POST' ? JSON.stringify(req.body) : ''
})
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :post-data'))

const requestLogger = (request, response, next) => {
  const method = request.method
  const path = request.path
  const time = new Date().toISOString()
  console.log(`${method} ${path} at ${time}`)
  next()
}
app.use(requestLogger)

// Fetch all persons
app.get('/api/persons', (req, res) => {
  Person.find({}).then((persons) => {
    res.json(persons)
  })
})

// Phonebook info
app.get('/info', (req, res, next) => {
  Person.countDocuments({}).then(count => {
    const currentDate = new Date()
    res.send(`<p>Phonebook has info for ${count} people</p><p>${currentDate}</p>`)
  })
    .catch(error => next(error))
})

// Fetch person by ID
app.get('/api/persons/:id', (req, res, next) => {
  Person.findById(req.params.id).then(person => {
    if (person) {
      res.json(person)
    } else {
      res.status(404).end()
    }
  })
    .catch(error => next(error)) // Error handling
})

// Delete person by ID
app.delete('/api/persons/:id', (req, res, next) => {
  Person.findByIdAndDelete(req.params.id).then(() => {
    res.status(204).end()
  })
    .catch(error => next(error))
})

// Add a new person or update existing one
app.post('/api/persons', (req, res, next) => {
  const body = req.body

  if (!body.name || !body.number) {
    return res.status(400).json({ error: 'name or number missing' })
  }

  // Find if the person already exists by name
  Person.findOne({ name: body.name }).then(existingPerson => {
    if (existingPerson) {
      const updatedPerson = {
        number: body.number
      }
      // Update the existing person using their ID
      Person.findByIdAndUpdate(existingPerson._id, updatedPerson, { new: true, runValidators: true })
        .then(updatedPerson => {
          res.json(updatedPerson)
        })
        .catch(error => next(error))

    } else {
      // If person doesn't exist, create a new entry
      const newPerson = new Person({
        name: body.name,
        number: body.number
      })

      newPerson.save().then(savedPerson => {
        res.json(savedPerson)
      })
        .catch(error => next(error))
    }
  }).catch(error => next(error))

})

// Handle unknown endpoints
const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

//Error handle middleware
const errorHandler = (error, request, response, next) => {
  console.error(error.message)
  if(error.name === 'ValidationError'){
    return response.status(400).send({ error: error.message })
  }
  next(error)
}
app.use(errorHandler)

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})