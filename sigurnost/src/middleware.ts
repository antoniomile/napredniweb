import { Request, Response, NextFunction } from 'express';
export {setUserInfo, requiresAuthentication, isAuthenticated, signOutUser };

type User = {
    username : string
    //latter we can add additional properties as isAdmin, groups, ...
}

//user(information) should be set using setUserInfo method below
declare global {
    namespace Express {
        export interface Request {
            user? : User
        }
    }
}

function isAuthenticated  (req : Request) : req is Request & Required<Pick<Request, 'user'>> {
    return req.user !== undefined;
}

const realm = "FER-Web2 Examples";

function requiresAuthentication(req : Request, res : Response, next : NextFunction) {
    if (req.user) next();
    else {
        res.writeHead(401, { 'WWW-Authenticate': `Basic realm='${realm}'` });    
        res.end('Authentication is needed');
    }
}

function setUserInfo(req : Request, res : Response, next : NextFunction) {
    if (req.headers.authorization) {
        let data = req.headers.authorization.replace(/^Basic /, '');        
        data = Buffer.from(data,'base64').toString('utf8');
        
        const loginInfo = data.split(':');
        const username = loginInfo[0];
        const password = loginInfo[1];        
        if (password === 'some password') {
            req.user = { username };            
        }
        else { //invalid username or password
            requiresAuthentication(req, res, next);
            return;
        }
    }
    next();    
}

function signOutUser (req : Request, res : Response, next : NextFunction){
    console.log(req.user);
    if (req.user){
        req.user = undefined;
    }
    console.log('q', req.user);
    next();
}