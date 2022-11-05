import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { auth, requiresAuth } from 'express-openid-connect';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config()

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'nl_zapad',
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: true
})

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug');

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 4080;

const config = {
  authRequired: false,
  idpLogout: true, //login not only from the app, but also from identity provider
  secret: process.env.SECRET,
  baseURL: externalUrl || `https://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: 'https://dev-eg1cq23l67r1llbc.us.auth0.com',
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    //scope: "openid profile email"   
  },
};
// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

let clubs : string[] = [];

getClubs().then(r => {
  clubs = r;
});

app.use((req, res, next) => {
  console.log("sd",clubs);
  res.locals.clubs = clubs;
  next();
})

app.get('/', function (req, res) {
  let username: string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('index', { username });
});

app.get('/private', requiresAuth(), function (req, res) {
  const user = JSON.stringify(req.oidc.user);
  res.render('private', { user });
});

app.get("/sign-up", (req, res) => {
  res.oidc.login({
    returnTo: '/',
    authorizationParams: {
      screen_hint: "signup",
    },
  });
});

if (externalUrl) {
  const hostname = '127.0.0.1';
  app.listen(port, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`)
  })
}
else {
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
    .listen(port, function () {
      console.log(`Server running at https://localhost:${port}/`);
    });

}
export async function getClubs() {
  console.log("getting clubs")
  const clubs: string[] = [];
  try {
    const results = await pool.query('SELECT * FROM klub');
    results.rows.forEach(r => {
      console.log(r);
      clubs.push(r["Ime"]);
    })
  } catch (error) {
    console.log(error);
  }
  console.log("mirko", clubs);
  return clubs;
}