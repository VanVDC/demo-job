const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
var logContent = require('../logInCheck/loginObj')


// // Get Job list
router.get('/', (req, res) => 
  Job.findAll()
    .then(jobs => res.render(('jobs'), {
      jobs
      }))
    .catch(err => console.log(err)));


// Display add Job form
router.get('/add', (req, res) => res.render('add',logContent));

// Add a Job
router.post('/add', (req, res) => {
  let { title, technologies, budget, description, contact_email } = req.body;
  let errors = [];

  // Validate Fields
  if(!title) {
    errors.push({ text: 'Please add a title' });
  }
  if(!technologies) {
    errors.push({ text: 'Please add some technologies' });
  }
  if(!description) {
    errors.push({ text: 'Please add a description' });
  }
  if(!contact_email) {
    errors.push({ text: 'Please add a contact email' });
  }

  // Check for errors
  if(errors.length > 0) {
    res.render('add', {
      errors,
      title, 
      technologies, 
      budget, 
      description, 
      contact_email,
      logContent
    });
  } else {
    if(!budget) {
      budget = 'Unknown';
    } else {
      budget = `$${budget}`;
    }

    // Make lowercase and remove space after comma
    technologies = technologies.toLowerCase().replace(/, /g, ',');

    // Insert into table
    Job.create({
      title,
      technologies,
      description,
      budget,
      contact_email
    })
      .then(job => res.redirect('/jobs'))
      .catch(err => console.log(err));
  }
});

// Search for jobs
router.get('/search', (req, res) => {
  let { term } = req.query;

  term = term.toLowerCase();

  Job.findAll({ where: { technologies: { [Op.like]: '%' + term + '%' } } })
    .then(jobs => res.render('jobs', { jobs, logContent }))
    .catch(err => console.log(err));
});

module.exports = router;