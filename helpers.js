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

function emailExists(email, database) {
  for (const user in database) {
    if (database[user]["email"] === email) {
      return true;
    }
  }
  return false;
}

function getUserByEmail(email, database) {
  for (const user in database) {
    if (database[user]["email"] === email) {
      return user;
    }
  }
}

function getUrlsForUser(id, database) {
  let urls = {};
  for (const key in database) {
    if (database[key]["userID"] === id) {
      urls[key] = database[key]["longURL"];
    }
  }
  return urls;
}

module.exports = {
  generateRandomString,
  emailExists,
  getUserByEmail,
  getUrlsForUser
};
