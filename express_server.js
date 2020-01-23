const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");

const { getUserByEmail } = require("./helpers");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
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

function generateRandomString() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function emailExists(email) {
  for (const key in users) {
    if (users[key]["email"] === email) {
      return true;
    }
  }
  return false;
}

function urlsForUser(id) {
  let urls = {};
  for (const key in urlDatabase) {
    if (urlDatabase[key]["userID"] === id) {
      urls[key] = urlDatabase[key].longURL;
    }
  }
  return urls;
}

function getUserFromRequest(req) {
  return req.session.user_id;
}

//registration page for new users
app.get("/register", (req, res) => {
  const userId = getUserFromRequest(req);
  let templateVars = { user: users[userId] };
  res.render("register", templateVars);
});

// store newly registered user's id, email, and password
app.post("/register", (req, res) => {
  const userId = generateRandomString();
  const { email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  if (emailExists(email)) {
    // if email already exists send back 400 response
    res.status(400);
    res.send("400 Status Code: Email already exists");
  }
  if (email === "" || password === "") {
    //if email or password fields are empty send back 400 response
    res.status(400);
    res.send("400 Status Code: Empty Email and/or Password");
  } else {
    // otherwise save new user's info and direct them to /urls
    users[userId] = Object.assign({
      id: userId,
      email,
      hashedPassword
    });
    req.session.user_id = userId;
    res.redirect("/urls");
  }
});

//login page
app.get("/login", (req, res) => {
  const userId = getUserFromRequest(req);
  let templateVars = { user: users[userId] };
  res.render("login", templateVars);
});

//log user in
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const userId = getUserByEmail(email, users);
  // check that user exists in database
  if (emailExists(email)) {
    // user was found
    if (bcrypt.compareSync(password, users[userId].hashedPassword)) {
      // password was correct
      req.session.user_id = userId;
      res.redirect("/urls");
    } else {
      //Error: password did not match
      res.status(403);
      res.send("403 Status Code: Incorrect password");
    }
  } else {
    //Error: user was not found redirect to registration page
    res.redirect("/register");
  }
});

//log user out
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

// redirects anyone from short URL to the assigned long URL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL]["longURL"];
  res.redirect(longURL);
});

// display urls for authorized user
app.get("/urls", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    let templateVars = {
      user: users[userId],
      urls: urlsForUser(userId) //filter for urls owned by userId
    };
    res.render("urls_index", templateVars);
  } else {
    //not logged, redirect to register or login first
    res.redirect("/login");
  }
});

// create new short/long URL pair. Can only be accessed by registered user
app.get("/urls/new", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    let templateVars = {
      user: users[userId],
      urls: urlsForUser(userId)
    };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// when a new url is made store information in that users database
app.post("/urls", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    const newShortURL = generateRandomString();
    urlDatabase[newShortURL] = { longURL: req.body.longURL, userID: userId };
    res.redirect(`/urls/${newShortURL}`);
  } else {
    res.status(403);
    res.send("403 Status Code: Must sign in to create short URLs\n");
  }
});

// display given shortURL with longURL pair for authorized user
app.get("/urls/:shortURL", (req, res) => {
  const userId = getUserFromRequest(req);
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[req.params.shortURL]["longURL"];
  console.log(longURL);
  if (userId) {
    //check if url is owned by userId
    if (shortURL in urlsForUser(userId)) {
      let templateVars = {
        user: users[userId],
        shortURL,
        longURL
      };
      res.render("urls_show", templateVars);
    } else {
      res.status(403);
      res.send("403 Status Code: URL does not belong to you");
    }
  } else {
    //not logged in and need to register or login first
    res.redirect("/login");
  }
});

//delete URL for authorized user
app.post(`/urls/:shortURL/delete`, (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    console.log(req.params.shortURL);
    //check if user owns the URL
    if (req.params.shortURL in urlsForUser(userId)) {
      delete urlDatabase[req.params.shortURL];
      res.redirect("/urls/");
    }
  } else {
    //user does not own the URL or isn't logged in
    res.status(403);
    res.send("403 Status Code: Unauthorized to delete this URL\n");
  }
});

//edit URL for authorized user
app.post("/urls/:shortURL", (req, res) => {
  const userId = getUserFromRequest(req);
  if (userId) {
    const { shortURL } = req.params;
    urlDatabase[shortURL] = { longURL: req.body["longURL"], userID: userId };
    res.redirect("/urls/");
  } else {
    res.status(403);
    res.send("403 Status Code: Unauthorized to edit this URL\n");
  }
});

//catchall for errors when routing incorrect urls
app.get("*", (req, res) => {
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
