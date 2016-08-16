var asteroid = require("asteroid");
var ws = require("ws");
var request = require('request');
var fs = require("fs");
var path = require("path");
var program = require('commander');

// We don't want to send errors too often if it gets stuck in a bad state (say server is down or login doesn't work)
var ERROR_FILE = path.join(__dirname, 'last_error.json');
var ERROR_REPORT_WAIT_TIME = 60 * 60 * 1000 // 1 Hour
var TOKEN;
var USER_ID;

program
  .version('0.0.1')
  .arguments('<SANDSTORM_RESUME_TOKEN> <PUSHOVER_TOKEN> <PUSHOVER_USER_ID>')
  .option('-s, --server [value]', 'The server to connect to (defaults to oasis.sandstorm.io)', "wss://oasis.sandstorm.io")
  .action(function (resumeToken, pushoverToken, pushoverUserId) {
    TOKEN = pushoverToken;
    USER_ID = pushoverUserId;
    startConnection(program.server, resumeToken);
  })
  .parse(process.argv);

function sendMessage(title, message) {
  request.post("https://api.pushover.net/1/messages.json", {
    form: {
      token: TOKEN,
      user: USER_ID,
      title: title,
      message: message,
    },
  });
}

function sendError(err) {
  console.error(err);

  var timestamp = new Date(0);
  if (fs.existsSync(ERROR_FILE)) {
    var data = JSON.parse(fs.readFileSync(ERROR_FILE));
    timestamp = new Date(data.timestamp);
  }

  if (new Date() - timestamp < ERROR_REPORT_WAIT_TIME) {
    console.error("Too many error messages sent out. Last error sent at: " + timestamp);
    return;
  }

  fs.writeFileSync(ERROR_FILE, JSON.stringify({
    timestamp: new Date(),
    err: err,
  }));

  sendMessage('Error in Sandstorm push server', err + "");
}

function startConnection(server, resumeToken) {
  var Asteroid = asteroid.createClass();
  // Connect to a Meteor backend
  var connection = new Asteroid({
      endpoint: server + "/websocket",
      Socketvarructor: ws,
  });

  connection.on("connected", function () {
    console.log("Connected to server: " + new Date());
    connection.subscribe("desktopNotifications");
  });

  connection.ddp.on("added", function (res) {
    if (res.collection === "desktopNotifications") {
      var msg = res.fields;
      var appActivity = msg.appActivity;
      sendMessage(appActivity.user.name + " " + appActivity.actionText.defaultText, appActivity.body.defaultText);
    }
  });

  connection.login({ resume: resumeToken }).then(function (result) {
    console.log("Successfully logged in");
    console.log(result);
  }).catch(function (error) {
    sendError(error);
  });
}
