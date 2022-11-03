const columnKeys = {
    courses: new Set([
        "audit",
        "avg",
        "dept",
        "fail",
        "id",
        "instructor",
        "pass",
        "title",
        "uuid",
        "year",
    ]),
    rooms: new Set([
        "fullname",
        "shortname",
        "number",
        "name",
        "address",
        "type",
        "furniture",
        "href",
        "lat",
        "lon",
        "seats",
    ]),
};

/**
 * Builds a query object using the current document object model (DOM). Triggered by clicking "Submit" button.
 * Must use the browser"s global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    // Get currently active form
    const form = document.querySelector(".tab-panel.active form");

    const id = form.getAttribute("data-type"); // currently ID and KIND are equal

    const query = { ID: id, KIND: id, WHERE: {}, OPTIONS: { COLUMNS: [] } };

    // !!! GET FILTER CONDITIONS

    // GET DISPLAY COLUMNS
    query.OPTIONS.COLUMNS.push(
        ...parseCheckboxes(id, form.querySelector(".form-group.columns")),
    );

    // GET ORDER
    const queryOrder = parseOrder(id, form.querySelector(".form-group.order"));

    if (queryOrder) {
        query.OPTIONS.ORDER = queryOrder;
    }

    // GET GROUP
    const queryGroup = parseCheckboxes(
        id,
        form.querySelector(".form-group.groups"),
    );

    if (queryGroup.length > 0) {
        query.TRANSFORMATIONS = { GROUP: queryGroup };
    }

    // GET APPLY - !!! We could throw an error in FE if this is attempted without GROUP?
    const queryApply = parseApply(
        id,
        form.querySelector(".form-group.transformations"),
    );

    if (queryApply.length > 0) {
        query.TRANSFORMATIONS = query.TRANSFORMATIONS || {};
        query.TRANSFORMATIONS.APPLY = queryApply;
    }

    console.log("FINAL QUERY: ", query);
    return query;
};

/**
 * Parses and returns array of selected column names
 * from Columns and Groups Section of input form
 *
 * @param {string} id - dataset id ("courses" or "rooms")
 * @param {HTMLElement} colForm - form containing the checkboxes to parse
 * @returns {string[]} - array of strings {id}_{column key} representing the checked options
 */
function parseCheckboxes(id, colForm) {
    const colArray = [];

    const selectedColEls = colForm.querySelectorAll('input[checked="checked"]');

    selectedColEls.forEach((colEl) => {
        const colVal = colEl.getAttribute("value");

        if (columnKeys[id].has(colVal)) {
            // Standard Column Name
            colArray.push(`${id}_${colVal}`);
        } else {
            // Custom Agg Col Name
            colArray.push(colVal);
        }
    });

    return colArray;
}

/**
 * Extracts ORDER section of query object from form input
 *
 * @param {string} id - dataset id ("courses" or "rooms")
 * @param {HTMLElement} orderForm - form element for ORDER section of query
 * @returns - ORDER object for query object
 */
function parseOrder(id, orderForm) {
    // Get keys of any selected Order columns
    const keys = Array.from(
        orderForm.querySelectorAll('select option[selected="selected"]'),
    ).map((orderEl) => {
        const colVal = orderEl.getAttribute("value");
        return columnKeys[id].has(colVal) ? `${id}_${colVal}` : colVal;
    });

    // No ORDER keys selected
    if (keys.length === 0) {
        return null;
    }

    // Is Descending Checkbox checked
    const dir =
        orderForm.querySelector(
            '.control.descending input[checked="checked"]',
        ) === null
            ? "UP"
            : "DOWN";

    // "Old" EBNF order syntax
    if (dir === "UP" && keys.length === 1) {
        return keys[0];
    } else {
        return { dir, keys };
    }
}

function parseApply(id, applyForm) {
    const applyObjects = [];

    const applyInputGroups = applyForm.querySelectorAll(
        ".control-group.transformation",
    );

    applyInputGroups.forEach((applyInputGroup) => {
        const aggName = applyInputGroup.querySelector(
            '.control.term input[type="text"]',
        ).value;

        // !!! Choosing to ignore any unnamed aggregations
        if (!aggName) return;

        // !!! In theory could error on FE if AggType does not match ColType
        const aggOpp = applyInputGroup.querySelector(
            '.control.operators select option[selected="selected"]',
        ).value;

        const aggCol = applyInputGroup.querySelector(
            '.control.fields select option[selected="selected"]',
        ).value;

        applyObjects.push({ [aggName]: { [aggOpp]: `${id}_${aggCol}` } });
    });

    return applyObjects;
}
