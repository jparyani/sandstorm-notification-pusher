# Sandstorm notification pusher

This is a quick and dirty example of how to get push notifications to your phone. It relies on an external app to handle the actual delivery of the notifications called [Pushover](https://pushover.net/). I'm not sure many people will really want to use Pushover, but hopefully this will serve as inspiration for some other interesting integrations.

## How to run

All you need is an installation of node v4+/npm. Tested working on node v6.3.1. This will *NOT* work on node v0.10.x.

First run:
```
npm install
```

Then run:
```
node main.js SANDSTORM_RESUME_TOKEN MY_PUSHOVER_TOKEN MY_PUSHOVER_USER_ID
```

* SANDSTORM_RESUME_TOKEN: a login token that meteor produces for you. The easiest way to find yours is to look at localStorage in your browser (open up a console and print it with `console.log(localStorage.getItem("Meteor.loginToken"))`)

* MY_PUSHOVER_TOKEN: This is the token you get from creating an app on Pushover

* MY_PUSHOVER_USER_ID: This is your pushover user id.

* -s optionally allows you to specify your own server (defaults to wss://oasis.sandstorm.io)
