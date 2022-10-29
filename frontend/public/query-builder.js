/**
 * Builds a query object using the current document object model (DOM). Triggered by clicking 'Submit' button.
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
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

    console.log(queryOrder);

    if (queryOrder) {
        query.OPTIONS.ORDER = queryOrder;
    }

    // !!! GET GROUPS

    // !!! GET TRANSFORMATIONS
    console.log("FINAL QUERY: ", query);
    return query;
};

/**
 * Parses and returns array of selected column names
 * from Columns and Groups Section of input form
 *
 * @param {string} id - dataset id ("courses" or "rooms")
 * @param {HTMLElement} colForm - form containing the checkboxes to parse
 */
function parseCheckboxes(id, colForm) {
    const colArray = [];

    const selectedColEls = colForm.querySelectorAll('input[checked="checked"]');

    selectedColEls.forEach((colEl) => {
        colArray.push(`${id}_${colEl.getAttribute("value")}`);
    });

    return colArray;
}

function parseOrder(id, orderForm) {
    // Get keys of any selected Order columns
    const keys = Array.from(
        orderForm.querySelectorAll('select option[selected="selected"]'),
    ).map((orderEl) => `${id}_${orderEl.getAttribute("value")}`);

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

    // 'Old' EBNF order syntax
    if (dir === "UP" && keys.length === 1) {
        return keys[0];
    } else {
        return { dir, keys };
    }
}
