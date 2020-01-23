function getUserByEmail(email, database) {
  for (const user in database) {
    if (database[user]["email"] === email) {
      return user;
    }
  }
}

module.exports = {
  getUserByEmail
};
