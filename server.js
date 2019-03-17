/***********************
  Load Components!

  Express      - A Node.js Framework
  Body-Parser  - A tool to help use parse the data in a post request
  Pg-Promise   - A database tool to help use connect to our PostgreSQL database
***********************/
var express = require('express'); //Ensure our express framework has been added
var app = express();
var bodyParser = require('body-parser'); //Ensure our body-parser tool has been added
app.use(bodyParser.json());              // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//Create Database Connection
var pgp = require('pg-promise')();

/**********************
  Database Connection information
  host: This defines the ip address of the server hosting our database.  We'll be using localhost and run our database on our local machine (i.e. can't be access via the Internet)
  port: This defines what port we can expect to communicate to our database.  We'll use 5432 to talk with PostgreSQL
  database: This is the name of our specific database.  From our previous lab, we created the football_db database, which holds our football data tables
  user: This should be left as postgres, the default user account created when PostgreSQL was installed
  password: This the password for accessing the database.  You'll need to set a password USING THE PSQL TERMINAL THIS IS NOT A PASSWORD FOR POSTGRES USER ACCOUNT IN LINUX!
**********************/
const dbConfig = {
	host: 'localhost',
	port: 5432,
	database: 'football_db',
	user: 'postgres',
	password: 'asdf1234'
};

var db = pgp(dbConfig);

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/'));//This line is necessary for us to use relative paths and access our resources directory



/*********************************
 Below we'll add the get & post requests which will handle:
   - Database access
   - Parse parameters from get (URL) and post (data package)
   - Render Views - This will decide where the user will go after the get/post request has been processed

 Web Page Requests:

  Login Page:        Provided For your (can ignore this page)
  Registration Page: Provided For your (can ignore this page)
  Home Page:
  		/home - get request (no parameters)
  				This route will make a single query to the favorite_colors table to retrieve all of the rows of colors
  				This data will be passed to the home view (pages/home)

  		/home/pick_color - post request (color_message)
  				This route will be used for reading in a post request from the user which provides the color message for the default color.
  				We'll be "hard-coding" this to only work with the Default Color Button, which will pass in a color of #FFFFFF (white).
  				The parameter, color_message, will tell us what message to display for our default color selection.
  				This route will then render the home page's view (pages/home)

  		/home/pick_color - get request (color)
  				This route will read in a get request which provides the color (in hex) that the user has selected from the home page.
  				Next, it will need to handle multiple postgres queries which will:
  					1. Retrieve all of the color options from the favorite_colors table (same as /home)
  					2. Retrieve the specific color message for the chosen color
  				The results for these combined queries will then be passed to the home view (pages/home)

  		/team_stats - get request (no parameters)
  			This route will require no parameters.  It will require 3 postgres queries which will:
  				1. Retrieve all of the football games in the Fall 2018 Season
  				2. Count the number of winning games in the Fall 2018 Season
  				3. Count the number of lossing games in the Fall 2018 Season
  			The three query results will then be passed onto the team_stats view (pages/team_stats).
  			The team_stats view will display all fo the football games for the season, show who won each game,
  			and show the total number of wins/losses for the season.

  		/player_info - get request (no parameters)
  			This route will handle a single query to the football_players table which will retrieve the id & name for all of the football players.
  			Next it will pass this result to the player_info view (pages/player_info), which will use the ids & names to populate the select tag for a form
************************************/

// login page
app.get('/', function(req, res) {
	res.render('pages/login',{
		local_css: 'signin.css',
		my_title: 'Login Page'
	});
});

// registration page
app.get('/register', function(req, res) {
	res.render('pages/register',{
		my_title: 'Registration Page'
	});
});

/*Add your other get/post request handlers below here: */
app.get('/home', function(req, res) {
    var query = 'select * from favorite_colors;';
    db.any(query)
    .then(rows => {
      res.render('pages/home',{
                my_title: 'Home Page',
                data: rows,
                color: '',
                color_msg: ''
            })
    })
    .catch(error => {
      // display error message in case an error
      console.err(error);
      res.render('pages/home', {
        title: 'Home Page',
        data: '',
        color: '',
        color_msg: ''
      })
    })
});

app.post('/home/pick_color', function(req, res) {
	var color_hex = req.body.color_hex;
	var color_name = req.body.color_name;
	var color_message = req.body.color_message;

	var insert_statement = "INSERT INTO favorite_colors(hex_value, name, color_msg) VALUES('" + color_hex + "','" +
							color_name + "','" + color_message +"') ON CONFLICT DO NOTHING;";

	var color_select = 'select * from favorite_colors;';

	db.task('get-everything', task => {
      return task.batch([
        task.any(insert_statement),
        task.any(color_select)
      ]);
    })
    .then(info => {
    	res.render('pages/home',{
				my_title: 'Home Page',
				data: info[1],
				color: color_hex,
				color_msg: color_message
			})
    })
    .catch(error => {
      // display error message in case an error
      console.log(error);
      res.render('pages/home', {
        my_title: 'Home Page',
        data: '',
        color: '',
        color_msg: ''
      })
    });
});

// team stats page
app.get('/team_stats', function(req, res) {
  let get_stats = 'select * from football_games;';
  let get_wins = 'select count(*) from football_games where visitor_score < home_score;';
  let get_losses = 'select count(*) from football_games where visitor_score > home_score;';

  db.task('get-stats', task => {
    return task.batch([
      task.any(get_wins),
      task.any(get_losses),
      task.any(get_stats)
    ])
  }).then(data => {
      console.dir(data);
      res.render('pages/team_stats', {
        my_title: 'Team Stats',
        wins: data[0][0].count,
        losses: data[1][0].count,
        data: data[2]
      });
    })
});


// player stats pages
app.get('/player_info', function(req, res) {
  let query = 'select * from football_players;';

  db.any(query)
    .then(data => {
      res.render('pages/player_info', {
        my_title: 'Player Stats',
        data: data,
        player_image: '',
        year: '',
        major: '',
        games: '',
        passing_yards: '',
        passing_yards_avg: '',
        rushing_yards: '',
        rushing_yards_avg: '',
        receiving_yards: '',
        receiving_yards_avg: ''
      });
    })
});

app.get('/player_info/post', function(req, res) {
  let player = req.query.player_choice;
  let info_query = "select year, major, passing_yards, rushing_yards, receiving_yards, img_src from football_players where name = '" + player + "';";

  let empty = err => {
    res.render('pages/player_info', {
      my_title: 'Player Stats',
      player_image: '',
      year: '',
      major: '',
      games: '',
      passing_yards: '',
      passing_yards_avg: '',
      rushing_yards: '',
      rushing_yards_avg: '',
      receiving_yards: '',
      receiving_yards_avg: ''
    });
  };

  if(player === "Select Player") {
    empty();
  }

  db.one(info_query)
    .then(data => {
      return {
        my_title: 'Player Stats',
        player_image: data.img_src,
        year: data.year,
        major: data.major,
        passing_yards: data.passing_yards,
        rushing_yards: data.rushing_yards,
        receiving_yards: data.receiving_yards
      };
    })
    .then(data => {
      let i = data.player_image;
      let number = parseInt(i.substr(i.lastIndexOf("/")+1).replace(".jpg", "").replace("player", ""));
      db.one('select count(*) from football_games where ' + number + ' = any(players);')
        .then(games => {
          return {
            ...data,
            games: games.count,
            passing_yards_avg: data.passing_yards / games.count,
            rushing_yards_avg: data.rushing_yards / games.count,
            receiving_yards_avg: data.receiving_yards / games.count,
          }
        })
        .then(data => {
          db.any('select * from football_players;')
            .then(players => {
              res.render('pages/player_info', {
                ...data,
                data: players
              });
            })
            .catch(empty);
        })
        .catch(empty);
    })
    .catch(empty);
});

app.listen(3000);
console.log('3000 is the magic port');
