import cluster from 'cluster';
import http from 'http';
import os from 'os';
import process from 'process';
import * as uuid from 'uuid';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
let options = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const PORT = process.env.PORT || 8000;
const totalCPUs = os.cpus().length;
if (cluster.isMaster) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);
    for (let i = 0; i < totalCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
        console.log("Let's fork another worker!");
        cluster.fork();
    });
}
else {
    startHttp();
}
function startHttp() {
    let server = http.createServer();
    console.log(`Worker ${process.pid} started`);
    const users = JSON.parse(fs.readFileSync('./users.json', "utf-8"));
    server.on('request', (req, res) => {
        var _a;
        try {
            let id = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split('/')[3];
            if (id && !uuid.validate(id)) {
                res.writeHead(400, options);
                return res.end("invalid useId");
            }
            if (id && uuid.validate(id)) {
                let user = users.find(el => el.id == id);
                if (!user) {
                    res.writeHead(404, options);
                    return res.end("User not found");
                }
            }
            if (req.method == 'GET') {
                if (req.url == '/api/users') {
                    res.writeHead(200, options);
                    return res.end(JSON.stringify(users));
                }
                if (req.url == `/api/users/${id}`) {
                    let user = users.find(el => el.id == id);
                    res.writeHead(200, options);
                    return res.end(JSON.stringify(user));
                }
            }
            if (req.method == 'POST') {
                if (req.url == '/api/users') {
                    req.on('data', (chunk) => {
                        let user = JSON.parse(chunk);
                        if (!user.username || !user.age || !user.hobbies) {
                            res.writeHead(400, options);
                            return res.end('Please fill all information');
                        }
                        user = { id: uuid.v4(), ...user };
                        users.push(user);
                        fs.writeFile('./users.json', JSON.stringify(users), () => {
                            res.writeHead(201, options);
                            res.end(JSON.stringify(user));
                        });
                    });
                }
            }
            if (req.method == 'PUT') {
                if (req.url == `/api/users/${id}`) {
                    req.on('data', (chunk) => {
                        let data = JSON.parse(chunk);
                        let user = users.find(el => el.id == id);
                        users.forEach(user => {
                            if (user.id == id) {
                                user.age = data.age ? data.age : user.age;
                                user.username = data.username ? data.username : user.username;
                                user.hobbies = data.hobbies ? data.hobbies : user.hobbies;
                            }
                        });
                        fs.writeFile('./users.json', JSON.stringify(users), () => {
                            res.writeHead(200, options);
                            res.end(JSON.stringify(user));
                        });
                    });
                }
            }
            if (req.method == 'DELETE') {
                if (req.url == `/api/users/${id}`) {
                    users.map((user, index) => {
                        if (user.id == id) {
                            users.splice(index, 1);
                        }
                    });
                    fs.writeFile('./users.json', JSON.stringify(users), () => {
                        res.writeHead(204, options);
                        res.end("user deleted");
                    });
                }
            }
        }
        catch (error) {
            res.writeHead(500, options);
            res.end("Uuups something went wrong :(");
        }
    });
    server.listen(PORT, () => {
        console.log('server running on port 8000!');
    });
}
//# sourceMappingURL=index.js.map