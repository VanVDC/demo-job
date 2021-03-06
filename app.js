var cookieParser = require('cookie-parser');
var session = require('express-session');
var morgan = require('morgan');
var User = require('./models/user');

const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const server =require('http').Server(app);
const io = require('socket.io').listen(server);


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

//set up authentication
// initialize express-session.
app.use(session({
  key: 'user_secretid',
  secret: 'somestuff',
  resave: false,
  saveUninitialized: false,
  cookie: {
      expires: 600000
  }
}));

// check if user's cookie is still saved in browser
app.use((req, res, next) => {
  if (req.cookies.user_secretid && !req.session.user) {
      res.clearCookie('user_secretid');        
  }
  next();
});

var logContent = {userName: '', loggedin: false, title: "You are not logged in today", body: "Hello World"}; 
//  function to check for logged-in
var sessionChecker = (req, res, next) => {
  if (req.session.user && req.cookies.user_secretid) {
  
      res.redirect('/welcome');
  } else {
      next();
  }    
};

// route for index
app.get('/', sessionChecker, (req, res) => {
  res.render('index');
});

// route for  signup
app.route('/signup')
    .get((req, res) => {
        res.render('signup', logContent);
    })
    .post((req, res) => {
        User.create({
            username: req.body.username,
            password: req.body.password
        })
        .then(user => {
            req.session.user = user.dataValues;
            res.redirect('/welcome');
        })
        .catch(error => {
            res.redirect('/signup');
        });
    });


// route for Login
app.route('/login')
    .get(sessionChecker, (req, res) => {
        res.render('login', logContent);
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
                res.redirect('/welcome');
            }
        });
    });

    // route for user's welcome
app.get('/welcome', (req, res) => {
  if (req.session.user && req.cookies.user_secretid) {
  logContent.loggedin = true; 
  logContent.userName = req.session.user.username; 
  console.log(req.session.user.username); 
  logContent.title = "You are logged in"; 
      res.render('index', logContent);
  } else {
      res.redirect('/login');
  }
});




// route for logout
app.get('/logout', (req, res) => {
  if (req.session.user && req.cookies.user_secretid) {
  logContent.loggedin = false; 
  logContent.title = "You are logged out!"; 
      res.clearCookie('user_secretid');
  console.log(JSON.stringify(logContent)); 
      res.redirect('/');
  } else {
      res.redirect('/login');
  }
});



// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Index route
app.get('/', (req, res) => res.render('index'));

// jobs routes
app.use('/jobs', require('./routes/jobs'));


//Chat route
const rooms = { }
app.get('/jobs/chat', (req, res) => {
  res.render('chat', { rooms: rooms })
})
app.post('/jobs/room', (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect('/chat')
  }
  rooms[req.body.room] = { users: {} }
  res.redirect(req.body.room)
  // Send message that new room was created
  io.emit('room-created', req.body.room)
})
app.get('/jobs/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/jobs/chat')
  }
  res.render('room', { roomName: req.params.room })
})


io.on('connection', socket => {
    socket.on('new-user', (room, name) => {
      socket.join(room)
      rooms[room].users[socket.id] = name
      socket.to(room).broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', (room, message) => {
      socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
    })
    socket.on('disconnect', () => {
      getUserRooms(socket).forEach(room => {
        socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
        delete rooms[room].users[socket.id]
      })
    })
  })
  
  function getUserRooms(socket) {
    return Object.entries(rooms).reduce((names, [name, room]) => {
      if (room.users[socket.id] != null) names.push(name)
      return names
    }, [])
  }

const PORT = process.env.PORT || 5000;

server.listen(PORT, console.log(`Server is running in ${PORT}`));