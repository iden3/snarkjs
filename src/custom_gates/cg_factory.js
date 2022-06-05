import RangeCheckCG, {RANGE_CHECK_ID, RANGE_CHECK_NAME} from "./cg_range_check.js";

export default class FactoryCG {
    static create(id, options) {
        if (!id) {
            throw Error("FactoryCG. Unable to create custom gate without its id");
        }

        if (RANGE_CHECK_ID === id) {
            return new RangeCheckCG(options);
        }

        throw Error(`FactoryCG. Unable to create custom gate, ${id} id doesn't exist`);
    }

    static createFromName(name, options) {
        if (!name) {
            throw Error("FactoryCG. Unable to create custom gate without its name");
        }

        let _name = name.toUpperCase();

        if(RANGE_CHECK_NAME === _name) {
            return this.create(RANGE_CHECK_ID, options);
        }

        throw Error(`FactoryCG. Unable to create custom gate, "${name}" name doesn't exist`);
    }

}