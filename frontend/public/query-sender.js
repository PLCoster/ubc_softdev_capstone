/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        console.log("Sending new XML REQUEST");
        const req = new XMLHttpRequest();
        req.onload = function () {
            console.log("XML REQUEST SUCCESS RESPONSE: ", this.response);
            resolve(this.response);
        };
        req.onerror = function () {
            console.log("XML REQUEST ERROR RESPONSE: ", this.response);
            reject(this.response);
        };
        req.open("POST", "/query");
        req.send(query);
    });
};
