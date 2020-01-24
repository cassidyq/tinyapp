const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const methodOverride = require("method-override");
const {
  generateRandomString,
  emailExists,
  getUserByEmail,
  getUrlsForUser,
  getUserFromRequest
} = require("./helpers");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(
  cookieSession({
    name: "session",
    keys: ["user_id"]
  })
);

const urlDatabase = {
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID: "user1" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "user1" },
  d6Ty2l: { longURL: "http://www.pawdopt.com", userID: "user2" }
};

const users = {
  user1: {
    id: "user1",
    email: "user@test.com",
    hashedPassword: bcrypt.hashSync("123", 10)
  },
  user2: {
    id: "user2",
    email: "user2@test.com",
    hashedPassword: bcrypt.hashSync("456", 10)
  }
};

// Routing

// Registration page
app.get("/register", (req, res) => {
  const userId = getUserFromRequest(req);
  console.log(userId);
  if (userId) {
    res.redirect("/urls");
  } else {
    let templateVars = { user: users[userId], error: null };
    res.render("register", templateVars);
  }
});

// Store newly registered users' id, email, and password
app.post("/register", (req, res) => {
  const userId = generateRandomString();
  let { email, password } = req.body;
  email = email.toLowerCase();
  const hashedPassword = bcrypt.hashSync(password, 10);
  if (emailExists(email, users)) {
    // If email already exists send back 400 response
    let templateVars = { user: users[userId], error: "Email already exists." };
    res.render("register", templateVars);
  } else {
    // Otherwise save new user's info and direct them to /urls
    users[userId] = Object.assign({
      id: userId,
      email,
      hashedPassword
    });
    req.session.user_id = userId;
    res.redirect("/urls");
  }
});

// Login page
app.get("/login", (req, res) => {
  const userId = getUserFromRequest(req);
  let templateVars = {
    user: users[userId],
    error: null
  };
  res.render("login", templateVars);
});

// Verify login credentials
app.put("/login", (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase();
  const userId = getUserByEmail(email, users);
  // Check that user exists in database
  if (emailExists(email, users)) {
    // User was found
    if (bcrypt.compareSync(password, users[userId].hashedPassword)) {
      // Password was correct
      req.session.user_id = userId;
      res.redirect("/urls");
    } else {
      // Error: password did not match
      let templateVars = { user: users[userId], error: "Wrong password." };
      res.render("login", templateVars);
    }
  } else {
    // Error: user was not found
    let templateVars = { user: users[userId], error: "Wrong email." };
    res.render("login", templateVars);
  }
});

// Log user out
app.put("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

// Redirects anyone from short URL to the assigned long URL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL]["longURL"];
  res.redirect(longURL);
});

// Display urls for authorized user
app.get("/urls", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    let templateVars = {
      user: users[userId],
      urls: getUrlsForUser(userId, urlDatabase), //filter for urls owned by userId
      error: null
    };
    res.render("urls_index", templateVars);
  } else {
    // Not logged, redirect to register or login first
    let templateVars = {
      user: users[userId],
      error: "Must be logged in to access page."
    };
    res.render("login", templateVars);
  }
});

// Create new short/long URL pair. Can only be accessed by registered user
app.get("/urls/new", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    let templateVars = {
      user: users[userId],
      urls: getUrlsForUser(userId, urlDatabase),
      error: null
    };
    res.render("urls_new", templateVars);
  } else {
    let templateVars = {
      user: users[userId],
      error: "Must be logged in to access page."
    };
    res.render("login", templateVars);
  }
});

// When a new url is made store information in that users database
app.put("/urls", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    const newShortURL = generateRandomString();
    urlDatabase[newShortURL] = { longURL: req.body.longURL, userID: userId };
    res.redirect(`/urls/${newShortURL}`);
  } else {
    res.status(403);
    res.send("403 Status Code: Must sign in to create new TinyURLs\n");
  }
});

// Display given shortURL with longURL pair for authorized user
app.get("/urls/:shortURL", (req, res) => {
  const userId = getUserFromRequest(req);
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[req.params.shortURL]["longURL"];
  // Check if user is logged in
  if (userId) {
    // Check if url is owned by userId
    if (shortURL in getUrlsForUser(userId, urlDatabase)) {
      let templateVars = {
        user: users[userId],
        shortURL,
        longURL,
        error: null
      };
      res.render("urls_show", templateVars);
    } else {
      let templateVars = {
        user: users[userId],
        urls: getUrlsForUser(userId, urlDatabase),
        error: "You do not have access to that short URL."
      };
      res.render("urls_index", templateVars);
    }
  } else {
    // User not logged in and need to register or login first
    let templateVars = { user: users[userId], error: "Cannot access page." };
    res.render("login", templateVars);
  }
});

// Delete URL for authorized user
app.delete("/urls/:shortURL", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    // Check if user owns the URL
    if (req.params.shortURL in getUrlsForUser(userId, urlDatabase)) {
      delete urlDatabase[req.params.shortURL];
      res.redirect("/urls/");
    }
  } else {
    // User does not own the URL or isn't logged in
    res.status(403);
    res.send("403 Status Code: Unauthorized to delete this URL\n");
  }
});

// Edit URL for authorized user
app.put("/urls/:shortURL", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    const { shortURL } = req.params;
    urlDatabase[shortURL] = { longURL: req.body["longURL"], userID: userId };
    res.redirect("/urls");
  } else {
    res.status(403);
    res.send("403 Status Code: Unauthorized to edit this URL\n");
  }
});

// Catchall for errors when routing incorrect urls
app.get("*", (req, res) => {
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
