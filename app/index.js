const express = require('express')
const path = require('path')
const exphbs = require('express-handlebars')
const passport = require('passport')
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const busboy = require('connect-busboy');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user');
const port = 3000;
const session = require('express-session');
const databaseConfig = require('./config/db');
const flash = require('connect-flash');
const app = express();
const moment = require('moment');
const prettyBytes = require('pretty-bytes');

require('mongoose').connect(databaseConfig.url);
require('./config/passport')(passport)

app.use(session({ secret: 'ipfsdrive' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride());
app.use(busboy());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

let hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: {
        fromNow: function (dateTime) {
            if(moment) {
                return moment(dateTime).fromNow();
            }
        },
        prettySize: function (size) {
            return prettyBytes(size);
        }
    },
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views/layouts')
});

app.engine('.hbs', hbs.engine)


app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, 'views'))

require('./routes/index')(app, passport);

app.listen(port);


