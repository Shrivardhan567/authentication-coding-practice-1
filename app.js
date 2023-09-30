const express = require("express");
const path = require("path");

const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
module.exports = app;
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register/", async (request, response) => {
  const userDetails = request.body;
  const { username, name, password, gender, location } = userDetails;
  const userInDB = `
    SELECT * 
    FROM user 
    WHERE username = '${username}' ;`;
  const isUserExist = await db.get(userInDB);
  if (isUserExist === undefined) {
    if (password.length >= 5) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
            INSERT INTO 
            user (username,name,password,gender,location)
            VALUES('${username}' , '${name}' , '${hashedPassword}' , '${gender}' , '${location}')`;
      response.status(200);
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const userInDB = `
    SELECT * 
    FROM user 
    WHERE username = '${username}' ;`;
  const UserDB = await db.get(userInDB);
  if (UserDB !== undefined) {
    const isPasswordCorrect = await bcrypt.compare(password, UserDB.password);
    if (isPasswordCorrect) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.put("/change-password", async (request, response) => {
  const changePasswordDetails = request.body;
  const { username, oldPassword, newPassword } = changePasswordDetails;

  const userInDBQuery = `SELECT * 
    FROM user 
    WHERE username = '${username}' ;`;

  const userInDB = await db.get(userInDBQuery);

  const isCurrentPasswordCorrect = await bcrypt.compare(
    oldPassword,
    userInDB.password
  );

  if (isCurrentPasswordCorrect) {
    if (newPassword.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatePassword = `
            UPDATE user
            SET 
            password = '${hashedNewPassword}' 
            WHERE username = '${username}'; `;

      await db.run(updatePassword);
      response.send("Password updated");
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});
