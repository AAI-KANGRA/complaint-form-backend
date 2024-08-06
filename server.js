/* const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Complaint = require('./model/complaint');  // Import the complaint model

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.use(express.static(path.join(__dirname, '../public')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/complaint', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

// Routes
app.post('/complaint', async (req, res) => {
    try {
        console.log('Received complaint:', req.body);  // Log the received complaint data
        await Complaint.updateMany({}, { highlighted: false });
        const complaint = new Complaint({ ...req.body, highlighted: true });
        await complaint.save();
        
        io.emit('newComplaint', complaint);  // Emit new complaint to all connected clients
        
        res.status(201).send(complaint);
    } catch (error) {
        console.error('Error saving complaint:', error);  // Log any errors
        res.status(400).send(error);
    }
});

app.get('/complaint', async (req, res) => {
    try {
        const category = req.query.category || '';
        const filter = category ? { category } : {};
        const complaints = await Complaint.find(filter);
        res.status(200).json(complaints);
    }  catch (error) {
        console.error('Error fetching complaints:', error);  // Log any errors
        res.status(500).send(error);
    }
});

app.get('/', (req,res) => {
    res.sendFile(path.json(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); */

    const express = require('express');
    const helmet = require('helmet');
    const mongoose = require('mongoose');
    const bodyParser = require('body-parser');
    const cors = require('cors');
    const http = require('http');
    const socketIo = require('socket.io');
    const path = require('path');
    const session = require('express-session');
    const passport = require('passport');
    const LocalStrategy = require('passport-local').Strategy;
    const bcrypt = require('bcrypt');   
    const flash = require('connect-flash');  // Typically, 'connect-flash' is used as 'flash'
    const Complaint = require('./model/complaint');
    const User = require('./model/user');  // Import the user model

    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    const port = process.env.PORT || 3000;

    // Middleware
    app.use(bodyParser.json());
    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST'],
    }));
    app.use(express.static(path.join(__dirname, '../public')));

    // Session and Passport setup
    app.use(session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true
    }));

    app.use(flash());

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
            styleSrc: ["'self'", "'unsafe-inline'"],  // Allow inline styles
            connectSrc: ["'self'"], // Allow connections to the same origin
            imgSrc: ["'self'"],     // Allow images from the same origin
            fontSrc: ["'self'"],    // Allow fonts from the same origin
            frameAncestors: ["'none'"], // Prevent framing of your content
        }
    }));

    // Passport configuration
    passport.use(new LocalStrategy(
        async (username, password, done) => {
            try {
                const user = await User.findOne({ username });
                if (user && await bcrypt.compare(password, user.password)) {
                    if (user.password === password) {  // Replace with hashed password check in production
                        return done(null, user);
                    } else {
                        return done(null, false, { message: 'Incorrect password.' });
                    }
                } else {
                    return done(null, false, { message: 'Incorrect username.' });
                }
            } catch (error) {
                return done(error);
            }
        }
    ));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });

    // Connect to MongoDB
    mongoose.connect('mongodb+srv://vanshikabatra:vanshika123@complaint-form-cluster.97ebgl6.mongodb.net/complaint?retryWrites=true&w=majority&appName=complaint-form-cluster', { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Connected to MongoDB'))
        .catch((error) => console.error('Error connecting to MongoDB:', error));

    // Routes
    app.post('/complaint', async (req, res) => {
        try {
            console.log('Received complaint:', req.body);
            const complaint = new Complaint({ ...req.body, highlighted: true });
            await complaint.save();
            console.log('Complaint saved:', complaint);
    
            io.emit('newComplaint', complaint);
    
            res.status(201).send(complaint);
        } catch (error) {
            console.error('Error saving complaint:', error);
            res.status(400).send(error);
        }
    });

    app.get('/complaint', async (req, res) => {
        try {
            const category = req.query.category || '';
            const filter = category ? { category } : {};
    
            // Fetch complaints sorted by highlighted (true first) and then by createdAt (newest first)
            const complaints = await Complaint.find(filter)
                .sort({ highlighted: -1, createdAt: -1 });
    
            res.status(200).json(complaints);
        } catch (error) {
            console.error('Error fetching complaints:', error.message, error.stack);
            res.status(500).send({message: 'Error fetching complaints', error});
        }
    });
    
    // Serve login page
    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/login.html'));
    });

    // Serve dashboard page (protected)
    app.get('/index.html', (req, res) => {
        if (req.isAuthenticated()) {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        } else {
            res.redirect('/login');
        }
    });

    // Handle login
    app.post('/login', (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) return next(err);
            if (!user) {
                return res.redirect('/login?message=' + encodeURIComponent(info.message));
            }
            req.logIn(user, (err) => {
                if (err) return next(err);
                return res.redirect('/index.html');
            });
        })(req, res, next);
    });

    // Handle logout
    app.get('/logout', (req, res) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/login');
        });
    });

    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });

    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
