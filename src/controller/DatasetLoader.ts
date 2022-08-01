import {
    InsightResponse,
    InsightDataset,
    InsightDatasetKind,
} from "./IInsightFacade";

export default class DatasetLoader {
    private loadedDatasets: { [key: string]: InsightDataset };

    constructor() {
        this.loadedDatasets = {};
    }

    public loadDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind
    ): Promise<InsightResponse> {
        return Promise.reject({ code: -1, body: null });
    }
}
