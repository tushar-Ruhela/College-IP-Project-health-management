import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = "https://brooks-incondite-jabberingly.ngrok-free.dev/exchange_token";

let access_token = null;
let refresh_token = null;

app.get("/auth", (req, res) => {
  const url =
    `https://www.strava.com/oauth/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${REDIRECT_URI}` +
    `&scope=activity:read_all,read`;

  res.redirect(url);
});


app.get("/exchange_token", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResp = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
      }
    );

    access_token = tokenResp.data.access_token;
    refresh_token = tokenResp.data.refresh_token;

    return res.send(`
      <h2>Authorization Successful!</h2>
      <p>You can now fetch:</p>
      <ul>
        <li>/activities</li>
        <li>/activities/run</li>
        <li>/activity/:id</li>
        <li>/activity/:id/heartrate</li>
      </ul>
    `);
  } catch (err) {
    console.error("Token exchange error:", err.response?.data);
    res.send("Token exchange failed.");
  }
});


app.get("/activities", async (req, res) => {
  if (!access_token) return res.send("Not authenticated. Go to /auth first.");

  try {
    const url = "https://www.strava.com/api/v3/athlete/activities";
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data);
    res.send("Error fetching activities");
  }
});


app.get("/activities/run", async (req, res) => {
  if (!access_token) return res.send("Not authenticated. Go to /auth first.");

  try {
    const url = "https://www.strava.com/api/v3/athlete/activities";
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const running = response.data.filter(a => a.sport_type === "Run");
    res.json(running);
  } catch (err) {
    console.error(err.response?.data);
    res.send("Error fetching running activities");
  }
});


app.get("/activity/:id", async (req, res) => {
  if (!access_token) return res.send("Not authenticated. Go to /auth first.");

  const id = req.params.id;

  try {
    const url = `https://www.strava.com/api/v3/activities/${id}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data);
    res.send("Error fetching activity details");
  }
});


app.get("/activity/:id/heartrate", async (req, res) => {
  if (!access_token) return res.send("Not authenticated. Go to /auth first.");

  const id = req.params.id;

  try {
    const url = `https://www.strava.com/api/v3/activities/${id}/streams?keys=heartrate,time,altitude,velocity_smooth,cadence&key_by_type=true`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data);
    res.send("Error fetching heartrate streams");
  }
});

app.listen(8080, () => console.log("Server running on 8080"));
