/**
 * Created by rtholmes on 2016-06-19.
 * Completed by PLCoster
 */

import fs = require("fs");
import restify = require("restify");

import { InsightResponse } from "../controller/IInsightFacade";

import InsightFacade from "../controller/InsightFacade";
import Log from "../Util";

/**
 * This configures the REST endpoints for the server.
 * http://restify.com/docs/home/
 */
export default class Server {
    private static insightFacade: InsightFacade = new InsightFacade();
    private port: number;
    private rest: restify.Server;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;

        // Initialise InsightFacade:
        return Server.insightFacade.initialise().then((result) => {
            if (!result) {
                throw new Error(
                    "Error when trying to initialise InsightFacade",
                );
            }

            // Initialise the Server itself
            return new Promise(function (fulfill, reject) {
                try {
                    Log.info("Server::start() - start");

                    that.rest = restify.createServer({
                        name: "insightUBC",
                    });
                    that.rest.use(
                        restify.bodyParser({ mapFiles: true, mapParams: true }),
                    );
                    that.rest.use(function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header(
                            "Access-Control-Allow-Headers",
                            "X-Requested-With",
                        );
                        res.setHeader("content-type", "application/json");
                        return next();
                    });

                    // This is an example endpoint that you can invoke by accessing this URL in your browser:
                    // http://localhost:4321/echo/hello
                    that.rest.get("/echo/:msg", Server.echo);

                    // API Endpoints
                    that.rest.put("/dataset/:id/:kind", Server.loadDataset);

                    // This must be the last endpoint!
                    that.rest.get("/.*", Server.getStatic);

                    that.rest.listen(that.port, function () {
                        Log.info(
                            "Server::start() - restify listening: " +
                                that.rest.url,
                        );
                        fulfill(true);
                    });

                    that.rest.on("error", function (err: string) {
                        // catches errors in restify start; unusual syntax due to internal
                        // node not using normal exceptions here
                        Log.info("Server::start() - restify ERROR: " + err);
                        reject(err);
                    });
                } catch (err) {
                    Log.error("Server::start() - ERROR: " + err);
                    reject(err);
                }
            });
        });
    }

    // Handles PUT requests to /dataset/:id/:kind
    // Loads Dataset into InsightFacade
    private static loadDataset(
        req: restify.Request,
        res: restify.Response,
        next: restify.Next,
    ) {
        Log.info("Server::loadDataset - params: " + JSON.stringify(req.params));

        const { id, kind } = req.params;
        const data = req.body || "";

        const zippedData = Buffer.from(data).toString("base64");

        Server.insightFacade
            .addDataset(id, zippedData, kind)
            .then((result: InsightResponse) => {
                Log.info(
                    `Server::loadDataset successful - responding ${result.code}`,
                );
                res.send(result.code, result.body); // Body not actually sent with 204 status code
            })
            .catch((result: InsightResponse) => {
                Log.info(
                    `Server::loadDataset failed - responding ${result.code}`,
                );
                res.send(result.code, result.body);
            })
            .finally(() => {
                return next();
            });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(
        req: restify.Request,
        res: restify.Response,
        next: restify.Next,
    ) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, { result: response });
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, { error: err });
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    // !!! Could potentially replace with restify.serveStatic ?
    private static getStatic(
        req: restify.Request,
        res: restify.Response,
        next: restify.Next,
    ) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }
}
