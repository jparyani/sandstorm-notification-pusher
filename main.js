const asteroid = require("asteroid");
const ws = require("ws");
const request = require('request');
const fs = require("fs");
const path = require("path");
const program = require('commander');

// We don't want to send errors too often if it gets stuck in a bad state (say server is down or login doesn't work)
const ERROR_FILE = path.join(__dirname, 'last_error.json');
const ERROR_REPORT_WAIT_TIME = 60 * 60 * 1000 // 1 Hour
let TOKEN;
let USER_ID;

program
  .version('0.0.1')
  .arguments('<SANDSTORM_RESUME_TOKEN> <PUSHOVER_TOKEN> <PUSHOVER_USER_ID>')
  .option('-s, --server [value]', 'The server to connect to (defaults to oasis.sandstorm.io)', "wss://oasis.sandstorm.io")
  .option('-m, --message-priority-regex [value]', 'A regex that when matched in a message will mark the message as high priority.')
  .option('-t, --title-priority-regex [value]', 'A regex that when matched in a title will mark the message as high priority.')
  .action(function (resumeToken, pushoverToken, pushoverUserId) {
    TOKEN = pushoverToken;
    USER_ID = pushoverUserId;
    m = program.messagePriorityRegex;
    t = program.titlePriorityRegex;
    startConnection(program.server, resumeToken, m && new RegExp(m), t && new RegExp(t));
  })
  .parse(process.argv);

function sendMessage(title, message, priority) {
  request.post("https://api.pushover.net/1/messages.json", {
    form: {
      token: TOKEN,
      user: USER_ID,
      title: title,
      message: message,
      priority: priority || 0,
    },
  });
}

function sendError(err) {
  console.error(err);

  let timestamp = new Date(0);
  if (fs.existsSync(ERROR_FILE)) {
    let data = JSON.parse(fs.readFileSync(ERROR_FILE));
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

  sendMessage('Error in Sandstorm push server', err + "", 1);
}

function startConnection(server, resumeToken, messageRegex, titleRegex) {
  const Asteroid = asteroid.createClass();
  // Connect to a Meteor backend
  const connection = new Asteroid({
      endpoint: server + "/websocket",
      SocketConstructor: ws,
  });

  connection.on("connected", function () {
    console.log("Connected to server: " + new Date());
    connection.subscribe("desktopNotifications");
  });

  connection.ddp.on("added", function (res) {
    if (res.collection === "desktopNotifications") {
      const msg = res.fields;
      const appActivity = msg.appActivity;
      let priority = 0;
      if (messageRegex && appActivity.body.defaultText.match(messageRegex)) {
        priority = 1;
      }
      if (titleRegex && appActivity.actionText.defaultText.match(titleRegex)) {
        priority = 1;
      }
      sendMessage(appActivity.user.name + " " + appActivity.actionText.defaultText, appActivity.body.defaultText, priority);
    }
  });

  connection.login({ resume: resumeToken }).then(function (result) {
    console.log("Successfully logged in");
    console.log(result);
  }).catch(function (error) {
    sendError(error);
  });
}
