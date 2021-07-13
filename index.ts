import fs from 'fs/promises';
import fsSync from 'fs';
import { PromiseUnwrap, promiseUnwrap } from 'morglod_mystd/lib/promise-unwrap';

export class FileDB<T> {
    data!: T;
    filepath!: string;

    constructor(filepath: string, initial?: () => T) {
        this.filepath = filepath;
        if (initial) this.data = initial();
    }

    init = async () => {
        if (!fsSync.existsSync(this.filepath)) {
            await fs.writeFile(this.filepath, JSON.stringify(this.data));
        } else {
            await this.read();
        }
    };

    read = async () => {
        const data = await fs.readFile(this.filepath, 'utf8');
        const x = JSON.parse(data);
        this.data = x;
        return x;
    };

    readSync = () => {
        const data = fsSync.readFileSync(this.filepath, 'utf8');
        const x = JSON.parse(data);
        this.data = x;
        return x;
    };

    _write_promise: PromiseUnwrap<void>|undefined;
    _write_require_timeout: any;

    write = async () => {
        // it means we are writing now, so we should require to write
        if (this._write_promise) {
            await this._write_promise.promise;
            this._write_require_timeout = setTimeout(() => {
                this.write();
            }, 200);
            return;
        }

        if (this._write_require_timeout) {
            clearTimeout(this._write_require_timeout);
        }

        const writePromise = this._write_promise = promiseUnwrap();
        const tmpPath = this.filepath + '.tmp';

        try {
            const x = JSON.stringify(this.data);
            await fs.writeFile(tmpPath, x, 'utf8');
            await fs.rename(tmpPath, this.filepath);

            this._write_promise = undefined;
            writePromise.resolve();
        } catch(err) {
            console.error(err);
            this._write_promise = undefined;
            writePromise.reject(err);
        }
    };

    writeSync = () => {
        const tmpPath = this.filepath + '.tmp';

        const x = JSON.stringify(this.data);
        fsSync.writeFileSync(tmpPath, x, 'utf8');
        fsSync.renameSync(tmpPath, this.filepath);
    };
}
