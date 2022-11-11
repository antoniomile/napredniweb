import * as auth from './middleware';
import express from 'express';
import path from 'path';
import http from 'http';
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
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: true }));

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 4080;

/* const config = {
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
}; */
// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth.setUserInfo);


let clubs : string[] = [];
let hack = '';
/* app.use((req, res, next) => {
  console.log("sd",clubs);
  res.locals.clubs = clubs;
  next();
}) */

app.get('/', function (req, res) {
  /* let username: string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  } */
  res.render('index', { user : req.user });
});

app.get('/private', auth.requiresAuthentication, function (req, res) {
  //const user = JSON.stringify(req.oidc.user);
  const username = req.user!.username;
  
  if (username.toLowerCase() === 'alice' || username.toLowerCase() === 'bob') {
    res.render('private', {user : req.user, clubs : clubs, hack: hack}); 
  }
  else {
      res.status(403);
      res.end('Forbidden for ' + username);
  }
});

app.get('/clubs', function (req, res){
  getClubs().then((r) => {
    clubs = r;
  }).then(() => {
    console.log("clubs", clubs);
    res.render('clubs', { clubs : clubs})
  });
})


app.post('/private', function (req : any, res){
  hack = req.body.hack;
  getClubs().then((r) => {
    clubs = r;
  });
  res.sendStatus(200);
})

if (externalUrl) {
  const hostname = '127.0.0.1';
  app.listen(port, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${port}/ and from outside on ${externalUrl}`)
  })
}
else {
  http.createServer(app)
    .listen(port, function () {
      console.log(`Server running at http://localhost:${port}/`);
    });

}
export async function getClubs() {
  console.log("getting clubs");
  //console.log('Sauce', hack);
  let q = `SELECT * FROM public.klub WHERE "ID_Klub" BETWEEN 1 AND 3 ${ hack } ORDER BY "ID_Klub" ASC `;
  const clubs: string[] = [];
  try {
    const results = await pool.query(q);
    results.rows.forEach(r => {
      console.log(r);
      clubs.push(r["Ime"]);
    })
  } catch (error) {
    console.log(error);
  }
  //console.log("mirko", clubs);
  return clubs;
}