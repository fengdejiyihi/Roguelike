import { sys } from "cc";
import { KeyValueSaveStorage } from "../domain/save";

export class LocalSaveStorage extends KeyValueSaveStorage {
	constructor(key = "roguelike-save") {
		super(sys.localStorage, key);
	}
}
