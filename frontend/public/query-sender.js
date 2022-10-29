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
            const result = JSON.parse(this.response);
            console.log("XML REQUEST SUCCESS RESPONSE: ", result);
            resolve(result);
        };
        req.onerror = function () {
            const result = JSON.parse(this.response);
            console.log("XML REQUEST ERROR RESPONSE: ", result);
            reject(result);
        };

        // Send query with appropriate method, header and body
        req.open("POST", "/query");
        req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        req.send(JSON.stringify(query));
    });
};
