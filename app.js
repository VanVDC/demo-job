var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var User = require('./models/user');


const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// Database
const db = require('./config/database');

//middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());



// Handlebars
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');


// Body Parser
app.use(bodyParser.urlencoded({ extended: false }));

//555555
// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
  key: 'user_sid',
  secret: 'somerandonstuffs',
  resave: false,
  saveUninitialized: false,
  cookie: {
      expires: 600000
  }
}));

// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
      res.clearCookie('user_sid');        
  }
  next();
});

var hbsContent = {userName: '', loggedin: false, title: "You are not logged in today", body: "Hello World"}; 
// middleware function to check for logged-in users
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_sid) {
  
      res.redirect('/dashboard');
  } else {
      next();
  }    
};

// route for Home-Page
app.get('/', sessionChecker, (req, res) => {
  res.redirect('/login');
});

// route for user signup
app.route('/signup')
    //.get(sessionChecker, (req, res) => {
    .get((req, res) => {
        //res.sendFile(__dirname + '/public/signup.html');
        res.render('signup', hbsContent);
    })
    .post((req, res) => {
        User.create({
            username: req.body.username,
            //email: req.body.email,
            password: req.body.password
        })
        .then(user => {
            req.session.user = user.dataValues;
            res.redirect('/dashboard');
        })
        .catch(error => {
            res.redirect('/signup');
        });
    });


// route for user Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        //res.sendFile(__dirname + '/public/login.html');
        res.render('login', hbsContent);
    })
    .post((req, res) => {
        var username = req.body.username,
            password = req.body.password;

        User.findOne({ where: { username: username } }).then(function (user) {
            if (!user) {
                res.redirect('/login');
            } else if (!user.validPassword(password)) {
                res.redirect('/login');
            } else {
                req.session.user = user.dataValues;
                res.redirect('/dashboard');
            }
        });
    });

    // route for user's dashboard
app.get('/dashboard', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
  hbsContent.loggedin = true; 
  hbsContent.userName = req.session.user.username; 
  //console.log(JSON.stringify(req.session.user)); 
  console.log(req.session.user.username); 
  hbsContent.title = "You are logged in"; 
      //res.sendFile(__dirname + '/public/dashboard.html');
      res.render('index', hbsContent);
  } else {
      res.redirect('/login');
  }
});


// route for user logout
app.get('/logout', (req, res) => {
  if (req.session.user && req.cookies.user_sid) {
  hbsContent.loggedin = false; 
  hbsContent.title = "You are logged out!"; 
      res.clearCookie('user_sid');
  console.log(JSON.stringify(hbsContent)); 
      res.redirect('/');
  } else {
      res.redirect('/login');
  }
});



// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Index route
app.get('/', (req, res) => res.render('index'));

// Gig routes
app.use('/gigs', require('./routes/gigs'));

//Chat route
app.use('/chat',require('./routes/chat'))

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server started on port ${PORT}`));