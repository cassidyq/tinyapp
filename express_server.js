const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const urlDatabase = {
  b2xVn2: { longURL: "http://www.lighthouselabs.ca", userID: "user1" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "user1" }
};

const users = {
  userRandomID: {
    id: "user1",
    email: "user@test.com",
    password: "123"
  },
  user2RandomID: {
    id: "user2",
    email: "user2@test.com",
    password: "456"
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

function getUserByEmail(email) {
  for (const key in users) {
    if (users[key]["email"] === email) {
      return key;
    }
  }
}

//register a new account
app.get("/register", (req, res) => {
  const userId = req.cookies.user_id;
  let templateVars = {
    user: users[userId],
    urls: urlDatabase
  };

  res.render("register", templateVars);
});
// add new user to the global user object with given email and password and a new random ID
app.post("/register", (req, res) => {
  const userId = generateRandomString();
  const { email, password } = req.body;
  if (emailExists(email)) {
    // send back a response with the 400 status code
    res.status(400);
    res.send("400 Status Code: Email already exists");
  }
  if (email === "" || password === "") {
    // send back a response with the 400 status code
    res.status(400);
    res.send("400 Status Code: Empty Email and/or Password");
  } else {
    users[userId] = Object.assign({ id: userId }, req.body);
    res.cookie("user_id", userId);
    res.redirect("/urls");
  }
});

//login
app.get("/login", (req, res) => {
  const userId = req.cookies.user_id;
  let templateVars = {
    user: users[userId],
    urls: urlDatabase
  };
  res.render("login", templateVars);
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const userId = getUserByEmail(email);

  // if (email === users[userId].email) {
  if (emailExists(email)) {
    // user was found
    if (password === users[userId].password) {
      // password was correct
      res.cookie("user_id", userId);
      res.redirect("/urls");
    } else {
      //password did not match
      res.status(403);
      res.send("403 Status Code: Incorrect password");
    }
  } else {
    //user was not found
    res.status(403);
    res.send("403 Status Code: Email not found");
  }
});

//logout
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});

// redirect from short URL to the assigned long URL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get("/urls", (req, res) => {
  const userId = req.cookies.user_id;
  let templateVars = {
    user: users[userId],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

// create new short and long URL pair. Can only be accessed by registered user
app.get("/urls/new", (req, res) => {
  const userId = req.cookies.user_id;
  if (userId) {
    let templateVars = { user: users[userId] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.post("/urls", (req, res) => {
  let newShortURL = generateRandomString();
  urlDatabase[newShortURL] = req.body.longURL;
  res.redirect(`/urls/${newShortURL}`);
});

// display shortURL
app.get("/urls/:shortURL", (req, res) => {
  const userId = req.cookies.user_id;
  let templateVars = {
    user: users[userId],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL]
  };
  res.render("urls_show", templateVars);
});

//delete URL
app.post(`/urls/:shortURL/delete`, (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls/");
});

//edit URL
app.post("/urls/:shortURL", (req, res) => {
  const { shortURL } = req.params;
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect("/urls/");
});

//catchall for errors when routing incorrect urls
app.get("*", (req, res) => {
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
