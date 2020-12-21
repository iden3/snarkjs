'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var ffjavascript = require('ffjavascript');
var fs = _interopDefault(require('fs'));
var Blake2b = _interopDefault(require('blake2b-wasm'));
var readline = _interopDefault(require('readline'));
var crypto = _interopDefault(require('crypto'));
var circomRuntime = _interopDefault(require('circom_runtime'));

async function open(fileName, openFlags, cacheSize, pageSize) {
    cacheSize = cacheSize || 4096*64;
    if (["w+", "wx+", "r", "ax+", "a+"].indexOf(openFlags) <0)
        throw new Error("Invalid open option");
    const fd =await fs.promises.open(fileName, openFlags);

    const stats = await fd.stat();

    return  new FastFile(fd, stats, cacheSize, pageSize, fileName);
}


class FastFile {

    constructor(fd, stats, cacheSize, pageSize, fileName) {
        this.fileName = fileName;
        this.fd = fd;
        this.pos = 0;
        this.pageSize = pageSize || (1 << 8);
        while (this.pageSize < stats.blksize) {
            this.pageSize *= 2;
        }
        this.totalSize = stats.size;
        this.totalPages = Math.floor((stats.size -1) / this.pageSize)+1;
        this.maxPagesLoaded = Math.floor( cacheSize / this.pageSize)+1;
        this.pages = {};
        this.pendingLoads = [];
        this.writing = false;
        this.reading = false;
        this.avBuffs = [];
        this.history = {};
    }

    _loadPage(p) {
        const self = this;
        const P = new Promise((resolve, reject)=> {
            self.pendingLoads.push({
                page: p,
                resolve: resolve,
                reject: reject
            });
        });
        self.__statusPage("After Load request: ", p);
        return P;
    }

    __statusPage(s, p) {
        const logEntry = [];
        const self=this;
        if (!self.logHistory) return;
        logEntry.push("==" + s+ " " +p);
        let S = "";
        for (let i=0; i<self.pendingLoads.length; i++) {
            if (self.pendingLoads[i].page == p) S = S + " " + i;
        }
        if (S) logEntry.push("Pending loads:"+S);
        if (typeof self.pages[p] != "undefined") {
            const page = self.pages[p];
            logEntry.push("Loaded");
            logEntry.push("pendingOps: "+page.pendingOps);
            if (page.loading) logEntry.push("loading: "+page.loading);
            if (page.writing) logEntry.push("writing");
            if (page.dirty) logEntry.push("dirty");
        }
        logEntry.push("==");

        if (!self.history[p]) self.history[p] = [];
        self.history[p].push(logEntry);
    }

    __printHistory(p) {
        const self = this;
        if (!self.history[p]) console.log("Empty History ", p);
        console.log("History "+p);
        for (let i=0; i<self.history[p].length; i++) {
            for (let j=0; j<self.history[p][i].length; j++) {
                console.log("-> " + self.history[p][i][j]);
            }
        }
    }



    _triggerLoad() {
        const self = this;

        if (self.reading) return;
        if (self.pendingLoads.length==0) return;

        const pageIdxs = Object.keys(self.pages);

        const deletablePages = [];
        for (let i=0; i<pageIdxs.length; i++) {
            const page = self.pages[parseInt(pageIdxs[i])];
            if ((page.dirty == false)&&(page.pendingOps==0)&&(!page.writing)&&(!page.loading)) deletablePages.push(parseInt(pageIdxs[i]));
        }

        let freePages = self.maxPagesLoaded - pageIdxs.length;

        const ops = [];

        // while pending loads and
        //     the page is loaded or I can recover one.
        while (
            (self.pendingLoads.length>0) &&
            (   (typeof self.pages[self.pendingLoads[0].page] != "undefined" )
              ||(  (freePages>0)
                 ||(deletablePages.length>0)))) {
            const load = self.pendingLoads.shift();
            if (typeof self.pages[load.page] != "undefined") {
                self.pages[load.page].pendingOps ++;
                const idx = deletablePages.indexOf(load.page);
                if (idx>=0) deletablePages.splice(idx, 1);
                if (self.pages[load.page].loading) {
                    self.pages[load.page].loading.push(load);
                } else {
                    load.resolve();
                }
                self.__statusPage("After Load (cached): ", load.page);

            } else {
                if (freePages) {
                    freePages--;
                } else {
                    const fp = deletablePages.shift();
                    self.__statusPage("Before Unload: ", fp);
                    self.avBuffs.unshift(self.pages[fp]);
                    delete self.pages[fp];
                    self.__statusPage("After Unload: ", fp);
                }

                if (load.page>=self.totalPages) {
                    self.pages[load.page] = getNewPage();
                    load.resolve();
                    self.__statusPage("After Load (new): ", load.page);
                } else {
                    self.reading = true;
                    self.pages[load.page] = getNewPage();
                    self.pages[load.page].loading = [load];
                    ops.push(self.fd.read(self.pages[load.page].buff, 0, self.pageSize, load.page*self.pageSize).then((res)=> {
                        self.pages[load.page].size = res.bytesRead;
                        const loading = self.pages[load.page].loading;
                        delete self.pages[load.page].loading;
                        for (let i=0; i<loading.length; i++) {
                            loading[i].resolve();
                        }
                        self.__statusPage("After Load (loaded): ", load.page);
                        return res;
                    }, (err) => {
                        load.reject(err);
                    }));
                    self.__statusPage("After Load (loading): ", load.page);
                }
            }
        }
        // if (ops.length>1) console.log(ops.length);

        Promise.all(ops).then( () => {
            self.reading = false;
            if (self.pendingLoads.length>0) setImmediate(self._triggerLoad.bind(self));
        });

        function getNewPage() {
            if (self.avBuffs.length>0) {
                const p = self.avBuffs.shift();
                p.dirty = false;
                p.pendingOps = 1;
                p.size =0;
                return p;
            } else {
                return {
                    dirty: false,
                    buff: new Uint8Array(self.pageSize),
                    pendingOps: 1,
                    size: 0
                };
            }
        }

    }


    _triggerWrite() {
        const self = this;
        if (self.writing) return;

        const pageIdxs = Object.keys(self.pages);

        const ops = [];

        for (let i=0; i<pageIdxs.length; i++) {
            const page = self.pages[parseInt(pageIdxs[i])];
            if (page.dirty) {
                page.dirty = false;
                page.writing = true;
                self.writing = true;
                ops.push( self.fd.write(page.buff, 0, page.size, parseInt(pageIdxs[i])*self.pageSize).then(() => {
                    page.writing = false;
                    return;
                }, (err) => {
                    console.log("ERROR Writing: "+err);
                    self.error = err;
                    self._tryClose();
                }));
            }
        }

        if (self.writing) {
            Promise.all(ops).then( () => {
                self.writing = false;
                setImmediate(self._triggerWrite.bind(self));
                self._tryClose();
                if (self.pendingLoads.length>0) setImmediate(self._triggerLoad.bind(self));
            });
        }
    }

    _getDirtyPage() {
        for (let p in this.pages) {
            if (this.pages[p].dirty) return p;
        }
        return -1;
    }

    async write(buff, pos) {
        if (buff.byteLength == 0) return;
        const self = this;
/*
        if (buff.byteLength > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(buff.byteLength * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
*/
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+buff.byteLength;
        if (self.totalSize < pos + buff.byteLength) self.totalSize = pos + buff.byteLength;
        if (self.pendingClose)
            throw new Error("Writing a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos + buff.byteLength -1) / self.pageSize);

        const pagePromises = [];
        for (let i=firstPage; i<=lastPage; i++) pagePromises.push(self._loadPage(i));
        self._triggerLoad();

        let p = firstPage;
        let o = pos % self.pageSize;
        let r = buff.byteLength;
        while (r>0) {
            await pagePromises[p-firstPage];
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = buff.slice( buff.byteLength - r, buff.byteLength - r + l);
            const dstView = new Uint8Array(self.pages[p].buff.buffer, o, l);
            dstView.set(srcView);
            self.pages[p].dirty = true;
            self.pages[p].pendingOps --;
            self.pages[p].size = Math.max(o+l, self.pages[p].size);
            if (p>=self.totalPages) {
                self.totalPages = p+1;
            }
            r = r-l;
            p ++;
            o = 0;
            if (!self.writing) setImmediate(self._triggerWrite.bind(self));
        }
    }

    async read(len, pos) {
        const self = this;
        let buff = new Uint8Array(len);
        await self.readToBuffer(buff, 0, len, pos);

        return buff;
    }

    async readToBuffer(buffDst, offset, len, pos) {
        if (len == 0) {
            return;
        }
        const self = this;
        if (len > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(len * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+len;
        if (self.pendingClose)
            throw new Error("Reading a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos + len -1) / self.pageSize);

        const pagePromises = [];
        for (let i=firstPage; i<=lastPage; i++) pagePromises.push(self._loadPage(i));

        self._triggerLoad();

        let p = firstPage;
        let o = pos % self.pageSize;
        // Remaining bytes to read
        let r = pos + len > self.totalSize ? len - (pos + len - self.totalSize): len;
        while (r>0) {
            await pagePromises[p - firstPage];
            self.__statusPage("After Await (read): ", p);

            // bytes to copy from this page
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = new Uint8Array(self.pages[p].buff.buffer, self.pages[p].buff.byteOffset + o, l);
            buffDst.set(srcView, offset+len-r);
            self.pages[p].pendingOps --;

            self.__statusPage("After Op done: ", p);

            r = r-l;
            p ++;
            o = 0;
            if (self.pendingLoads.length>0) setImmediate(self._triggerLoad.bind(self));
        }

        this.pos = pos + len;

    }


    _tryClose() {
        const self = this;
        if (!self.pendingClose) return;
        if (self.error) {
            self.pendingCloseReject(self.error);
        }
        const p = self._getDirtyPage();
        if ((p>=0) || (self.writing) || (self.reading) || (self.pendingLoads.length>0)) return;
        self.pendingClose();
    }

    close() {
        const self = this;
        if (self.pendingClose)
            throw new Error("Closing the file twice");
        return new Promise((resolve, reject) => {
            self.pendingClose = resolve;
            self.pendingCloseReject = reject;
            self._tryClose();
        }).then(()=> {
            self.fd.close();
        }, (err) => {
            self.fd.close();
            throw (err);
        });
    }

    async discard() {
        const self = this;
        await self.close();
        await fs.promises.unlink(this.fileName);
    }

    async writeULE32(v, pos) {
        const self = this;
        const tmpBuff32 = new Uint8Array(4);
        const tmpBuff32v = new DataView(tmpBuff32.buffer);

        tmpBuff32v.setUint32(0, v, true);

        await self.write(tmpBuff32, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        const tmpBuff32 = new Uint8Array(4);
        const tmpBuff32v = new DataView(tmpBuff32.buffer);

        tmpBuff32v.setUint32(0, v, false);

        await self.write(tmpBuff32, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        const tmpBuff64 = new Uint8Array(8);
        const tmpBuff64v = new DataView(tmpBuff64.buffer);

        tmpBuff64v.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64, pos);
    }

    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

}

function createNew(o) {
    const initialSize = o.initialSize || 1<<20;
    const fd = new MemFile();
    fd.o = o;
    fd.o.data = new Uint8Array(initialSize);
    fd.allocSize = initialSize;
    fd.totalSize = 0;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

function readExisting(o) {
    const fd = new MemFile();
    fd.o = o;
    fd.allocSize = o.data.byteLength;
    fd.totalSize = o.data.byteLength;
    fd.readOnly = true;
    fd.pos = 0;
    return fd;
}

const tmpBuff32 = new Uint8Array(4);
const tmpBuff32v = new DataView(tmpBuff32.buffer);
const tmpBuff64 = new Uint8Array(8);
const tmpBuff64v = new DataView(tmpBuff64.buffer);

class MemFile {

    constructor() {
        this.pageSize = 1 << 14;  // for compatibility
    }

    _resizeIfNeeded(newLen) {
        if (newLen > this.allocSize) {
            const newAllocSize = Math.max(
                this.allocSize + (1 << 20),
                Math.floor(this.allocSize * 1.1),
                newLen
            );
            const newData = new Uint8Array(newAllocSize);
            newData.set(this.o.data);
            this.o.data = newData;
            this.allocSize = newAllocSize;
        }
    }

    async write(buff, pos) {
        const self =this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) throw new Error("Writing a read only file");

        this._resizeIfNeeded(pos + buff.byteLength);

        this.o.data.set(buff.slice(), pos);

        if (pos + buff.byteLength > this.totalSize) this.totalSize = pos + buff.byteLength;

        this.pos = pos + buff.byteLength;
    }

    async readToBuffer(buffDest, offset, len, pos) {
        const self = this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) {
            if (pos + len > this.totalSize) throw new Error("Reading out of bounds");
        }
        this._resizeIfNeeded(pos + len);

        const buffSrc = new Uint8Array(this.o.data.buffer, this.o.data.byteOffset + pos, len);

        buffDest.set(buffSrc, offset);

        this.pos = pos + len;
    }

    async read(len, pos) {
        const self = this;

        const buff = new Uint8Array(len);
        await self.readToBuffer(buff, 0, len, pos);

        return buff;
    }

    close() {
        if (this.o.data.byteLength != this.totalSize) {
            this.o.data = this.o.data.slice(0, this.totalSize);
        }
    }

    async discard() {
    }


    async writeULE32(v, pos) {
        const self = this;

        tmpBuff32v.setUint32(0, v, true);

        await self.write(tmpBuff32, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        tmpBuff32v.setUint32(0, v, false);

        await self.write(tmpBuff32, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        tmpBuff64v.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64, pos);
    }


    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

}

const PAGE_SIZE = 1<<22;

function createNew$1(o) {
    const initialSize = o.initialSize || 0;
    const fd = new BigMemFile();
    fd.o = o;
    const nPages = initialSize ? Math.floor((initialSize - 1) / PAGE_SIZE)+1 : 0;
    fd.o.data = [];
    for (let i=0; i<nPages-1; i++) {
        fd.o.data.push( new Uint8Array(PAGE_SIZE));
    }
    if (nPages) fd.o.data.push( new Uint8Array(initialSize - PAGE_SIZE*(nPages-1)));
    fd.totalSize = 0;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

function readExisting$1(o) {
    const fd = new BigMemFile();
    fd.o = o;
    fd.totalSize = (o.data.length-1)* PAGE_SIZE + o.data[o.data.length-1].byteLength;
    fd.readOnly = true;
    fd.pos = 0;
    return fd;
}

const tmpBuff32$1 = new Uint8Array(4);
const tmpBuff32v$1 = new DataView(tmpBuff32$1.buffer);
const tmpBuff64$1 = new Uint8Array(8);
const tmpBuff64v$1 = new DataView(tmpBuff64$1.buffer);

class BigMemFile {

    constructor() {
        this.pageSize = 1 << 14;  // for compatibility
    }

    _resizeIfNeeded(newLen) {

        if (newLen <= this.totalSize) return;

        if (this.readOnly) throw new Error("Reading out of file bounds");

        const nPages = Math.floor((newLen - 1) / PAGE_SIZE)+1;
        for (let i= Math.max(this.o.data.length-1, 0); i<nPages; i++) {
            const newSize = i<nPages-1 ? PAGE_SIZE : newLen - (nPages-1)*PAGE_SIZE;
            const p = new Uint8Array(newSize);
            if (i == this.o.data.length-1) p.set(this.o.data[i]);
            this.o.data[i] = p;
        }
        this.totalSize = newLen;
    }

    async write(buff, pos) {
        const self =this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) throw new Error("Writing a read only file");

        this._resizeIfNeeded(pos + buff.byteLength);

        const firstPage = Math.floor(pos / PAGE_SIZE);

        let p = firstPage;
        let o = pos % PAGE_SIZE;
        let r = buff.byteLength;
        while (r>0) {
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = buff.slice(buff.byteLength - r, buff.byteLength - r + l);
            const dstView = new Uint8Array(self.o.data[p].buffer, o, l);
            dstView.set(srcView);
            r = r-l;
            p ++;
            o = 0;
        }

        this.pos = pos + buff.byteLength;
    }

    async readToBuffer(buffDst, offset, len, pos) {
        const self = this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) {
            if (pos + len > this.totalSize) throw new Error("Reading out of bounds");
        }
        this._resizeIfNeeded(pos + len);

        const firstPage = Math.floor(pos / PAGE_SIZE);

        let p = firstPage;
        let o = pos % PAGE_SIZE;
        // Remaining bytes to read
        let r = len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = new Uint8Array(self.o.data[p].buffer, o, l);
            buffDst.set(srcView, offset+len-r);
            r = r-l;
            p ++;
            o = 0;
        }

        this.pos = pos + len;
    }

    async read(len, pos) {
        const self = this;
        const buff = new Uint8Array(len);

        await self.readToBuffer(buff, 0, len, pos);

        return buff;
    }

    close() {
    }

    async discard() {
    }


    async writeULE32(v, pos) {
        const self = this;

        tmpBuff32v$1.setUint32(0, v, true);

        await self.write(tmpBuff32$1, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        tmpBuff32v$1.setUint32(0, v, false);

        await self.write(tmpBuff32$1, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        tmpBuff64v$1.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v$1.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64$1, pos);
    }


    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

}

/* global fetch */

const DEFAULT_CACHE_SIZE = (1 << 16);
const DEFAULT_PAGE_SIZE = (1 << 13);


async function createOverride(o, b, c) {
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b || DEFAULT_CACHE_SIZE,
            pageSize: c || DEFAULT_PAGE_SIZE
        };
    }
    if (o.type == "file") {
        return await open(o.fileName, "w+", o.cacheSize, o.pageSize);
    } else if (o.type == "mem") {
        return createNew(o);
    } else if (o.type == "bigMem") {
        return createNew$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

async function readExisting$2(o, b, c) {
    if (o instanceof Uint8Array) {
        o = {
            type: "mem",
            data: o
        };
    }
    if (process.browser) {
        if (typeof o === "string") {
            const buff = await fetch(o).then( function(res) {
                return res.arrayBuffer();
            }).then(function (ab) {
                return new Uint8Array(ab);
            });
            o = {
                type: "mem",
                data: buff
            };
        }
    } else {
        if (typeof o === "string") {
            o = {
                type: "file",
                fileName: o,
                cacheSize: b || DEFAULT_CACHE_SIZE,
                pageSize: c || DEFAULT_PAGE_SIZE
            };
        }
    }
    if (o.type == "file") {
        return await open(o.fileName, "r", o.cacheSize, o.pageSize);
    } else if (o.type == "mem") {
        return await readExisting(o);
    } else if (o.type == "bigMem") {
        return await readExisting$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

async function readBinFile(fileName, type, maxVersion, cacheSize, pageSize) {

    const fd = await readExisting$2(fileName, cacheSize, pageSize);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

    if (readedType != type) throw new Error(fileName + ": Invalid File format");

    let v = await fd.readULE32();

    if (v>maxVersion) throw new Error("Version not supported");

    const nSections = await fd.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fd.readULE32();
        let hl = await fd.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fd.pos,
            size: hl
        });
        fd.pos += hl;
    }

    return {fd, sections};
}

async function createBinFile(fileName, type, version, nSections, cacheSize, pageSize) {

    const fd = await createOverride(fileName, cacheSize, pageSize);

    const buff = new Uint8Array(4);
    for (let i=0; i<4; i++) buff[i] = type.charCodeAt(i);
    await fd.write(buff, 0); // Magic "r1cs"

    await fd.writeULE32(version); // Version
    await fd.writeULE32(nSections); // Number of Sections

    return fd;
}

async function startWriteSection(fd, idSection) {
    if (typeof fd.writingSection !== "undefined") throw new Error("Already writing a section");
    await fd.writeULE32(idSection); // Header type
    fd.writingSection = {
        pSectionSize: fd.pos
    };
    await fd.writeULE64(0); // Temporally set to 0 length
}

async function endWriteSection(fd) {
    if (typeof fd.writingSection === "undefined") throw new Error("Not writing a section");

    const sectionSize = fd.pos - fd.writingSection.pSectionSize - 8;
    const oldPos = fd.pos;
    fd.pos = fd.writingSection.pSectionSize;
    await fd.writeULE64(sectionSize);
    fd.pos = oldPos;
    delete fd.writingSection;
}

async function startReadUniqueSection(fd, sections, idSection) {
    if (typeof fd.readingSection !== "undefined") throw new Error("Already reading a section");
    if (!sections[idSection])  throw new Error(fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) throw new Error(fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

async function endReadSection(fd, noCheck) {
    if (typeof fd.readingSection === "undefined") throw new Error("Not reading a section");
    if (!noCheck) {
        if (fd.pos-fd.readingSection.p !=  fd.readingSection.size) throw new Error("Invalid section size reading");
    }
    delete fd.readingSection;
}

async function writeBigInt(fd, n, n8, pos) {
    const buff = new Uint8Array(n8);
    ffjavascript.Scalar.toRprLE(buff, 0, n, n8);
    await fd.write(buff, pos);
}

async function readBigInt(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return ffjavascript.Scalar.fromRprLE(buff, 0, n8);
}

async function copySection(fdFrom, sections, fdTo, sectionId, size) {
    if (typeof size === "undefined") {
        size = sections[sectionId][0].size;
    }
    const chunkSize = fdFrom.pageSize;
    await startReadUniqueSection(fdFrom, sections, sectionId);
    await startWriteSection(fdTo, sectionId);
    for (let p=0; p<size; p+=chunkSize) {
        const l = Math.min(size -p, chunkSize);
        const buff = await fdFrom.read(l);
        await fdTo.write(buff);
    }
    await endWriteSection(fdTo);
    await endReadSection(fdFrom, size != sections[sectionId][0].size);

}

async function readSection(fd, sections, idSection, offset, length) {

    offset = (typeof offset === "undefined") ? 0 : offset;
    length = (typeof length === "undefined") ? sections[idSection][0].size - offset : length;

    if (offset + length > sections[idSection][0].size) {
        throw new Error("Reading out of the range of the section");
    }

    let buff;
    if (length < (1 << 30) ) {
        buff = new Uint8Array(length);
    } else {
        buff = new ffjavascript.BigBuffer(length);
    }

    await fd.readToBuffer(buff, 0, length, sections[idSection][0].p + offset);
    return buff;
}

async function sectionIsEqual(fd1, sections1, fd2, sections2, idSection) {
    const MAX_BUFF_SIZE = fd1.pageSize * 16;
    await startReadUniqueSection(fd1, sections1, idSection);
    await startReadUniqueSection(fd2, sections2, idSection);
    if (sections1[idSection][0].size != sections2[idSection][0].size) return false;
    const totalBytes=sections1[idSection][0].size;
    for (let i=0; i<totalBytes; i+= MAX_BUFF_SIZE) {
        const n = Math.min(totalBytes-i, MAX_BUFF_SIZE);
        const buff1 = await fd1.read(n);
        const buff2 = await fd2.read(n);
        for (let j=0; j<n; j++) if (buff1[j] != buff2[j]) return false;
    }
    await endReadSection(fd1);
    await endReadSection(fd2);
    return true;
}

const bls12381r = ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const bls12381q = ffjavascript.Scalar.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
const bn128q = ffjavascript.Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromQ(q) {
    let curve;
    if (ffjavascript.Scalar.eq(q, bn128q)) {
        curve = await ffjavascript.buildBn128();
    } else if (ffjavascript.Scalar.eq(q, bls12381q)) {
        curve = await ffjavascript.buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${ffjavascript.Scalar.toString(q)}`);
    }
    return curve;
}

async function getCurveFromName(name) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBn128();
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await ffjavascript.buildBls12381();
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

/* global window */

const _revTable = [];
for (let i=0; i<256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}


function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function formatHash(b, title) {
    const a = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let S = "";
    for (let i=0; i<4; i++) {
        if (i>0) S += "\n";
        S += "\t\t";
        for (let j=0; j<4; j++) {
            if (j>0) S += " ";
            S += a.getUint32(i*16+j*4).toString(16).padStart(8, "0");
        }
    }
    if (title) S = title + "\n" + S;
    return S;
}

function hashIsEqual(h1, h2) {
    if (h1.byteLength != h2.byteLength) return false;
    var dv1 = new Int8Array(h1);
    var dv2 = new Int8Array(h2);
    for (var i = 0 ; i != h1.byteLength ; i++)
    {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}

function cloneHasher(h) {
    const ph = h.getPartialHash();
    const res = Blake2b(64);
    res.setPartialHash(ph);
    return res;
}

async function sameRatio(curve, g1s, g1sx, g2s, g2sx) {
    if (curve.G1.isZero(g1s)) return false;
    if (curve.G1.isZero(g1sx)) return false;
    if (curve.G2.isZero(g2s)) return false;
    if (curve.G2.isZero(g2sx)) return false;
    // return curve.F12.eq(curve.pairing(g1s, g2sx), curve.pairing(g1sx, g2s));
    const res = await curve.pairingEq(g1s, g2sx, curve.G1.neg(g1sx), g2s);
    return res;
}


function askEntropy() {
    if (process.browser) {
        return window.prompt("Enter a random text. (Entropy): ", "");
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question("Enter a random text. (Entropy): ", (input) => resolve(input) );
        });
    }
}

async function getRandomRng(entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = Blake2b(64);
    hasher.update(crypto.randomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i=0;i<8;i++) {
        seed[i] = hash.readUInt32BE(i*4);
    }
    const rng = new ffjavascript.ChaCha(seed);
    return rng;
}

function rngFromBeaconParams(beaconHash, numIterationsExp) {
    let nIterationsInner;
    let nIterationsOuter;
    if (numIterationsExp<32) {
        nIterationsInner = (1 << numIterationsExp) >>> 0;
        nIterationsOuter = 1;
    } else {
        nIterationsInner = 0x100000000;
        nIterationsOuter = (1 << (numIterationsExp-32)) >>> 0;
    }

    let curHash = beaconHash;
    for (let i=0; i<nIterationsOuter; i++) {
        for (let j=0; j<nIterationsInner; j++) {
            curHash = crypto.createHash("sha256").update(curHash).digest();
        }
    }

    const curHashV = new DataView(curHash.buffer, curHash.byteOffset, curHash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = curHashV.getUint32(i*4, false);
    }

    const rng = new ffjavascript.ChaCha(seed);

    return rng;
}

function hex2ByteArray(s) {
    if (s instanceof Uint8Array) return s;
    if (s.slice(0,2) == "0x") s= s.slice(2);
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}

function byteArray2hex(byteArray) {
    return Array.prototype.map.call(byteArray, function(byte) {
        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}

async function writeHeader(fd, zkey) {

    // Write the header
    ///////////
    await startWriteSection(fd, 1);
    await fd.writeULE32(1); // Groth
    await endWriteSection(fd);

    // Write the Groth header section
    ///////////

    const curve = await getCurveFromQ(zkey.q);

    await startWriteSection(fd, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (ffjavascript.Scalar.bitLength(primeR) - 1) / 64) +1)*8;

    await fd.writeULE32(n8q);
    await writeBigInt(fd, primeQ, n8q);
    await fd.writeULE32(n8r);
    await writeBigInt(fd, primeR, n8r);
    await fd.writeULE32(zkey.nVars);                         // Total number of bars
    await fd.writeULE32(zkey.nPublic);                       // Total number of public vars (not including ONE)
    await fd.writeULE32(zkey.domainSize);                  // domainSize
    await writeG1(fd, curve, zkey.vk_alpha_1);
    await writeG1(fd, curve, zkey.vk_beta_1);
    await writeG2(fd, curve, zkey.vk_beta_2);
    await writeG2(fd, curve, zkey.vk_gamma_2);
    await writeG1(fd, curve, zkey.vk_delta_1);
    await writeG2(fd, curve, zkey.vk_delta_2);

    await endWriteSection(fd);


}

async function writeG1(fd, curve, p) {
    const buff = new Uint8Array(curve.G1.F.n8*2);
    curve.G1.toRprLEM(buff, 0, p);
    await fd.write(buff);
}

async function writeG2(fd, curve, p) {
    const buff = new Uint8Array(curve.G2.F.n8*2);
    curve.G2.toRprLEM(buff, 0, p);
    await fd.write(buff);
}

async function readG1(fd, curve) {
    const buff = await fd.read(curve.G1.F.n8*2);
    return curve.G1.fromRprLEM(buff, 0);
}

async function readG2(fd, curve) {
    const buff = await fd.read(curve.G2.F.n8*2);
    return curve.G2.fromRprLEM(buff, 0);
}



async function readHeader(fd, sections, protocol) {
    if (protocol != "groth16") throw new Error("Protocol not supported: "+protocol);

    const zkey = {};

    // Read Header
    /////////////////////
    await startReadUniqueSection(fd, sections, 1);
    const protocolId = await fd.readULE32();
    if (protocolId != 1) throw new Error("File is not groth");
    zkey.protocol = "groth16";
    await endReadSection(fd);

    // Read Groth Header
    /////////////////////
    await startReadUniqueSection(fd, sections, 2);
    const n8q = await fd.readULE32();
    zkey.n8q = n8q;
    zkey.q = await readBigInt(fd, n8q);

    const n8r = await fd.readULE32();
    zkey.n8r = n8r;
    zkey.r = await readBigInt(fd, n8r);

    let curve = await getCurveFromQ(zkey.q);

    zkey.nVars = await fd.readULE32();
    zkey.nPublic = await fd.readULE32();
    zkey.domainSize = await fd.readULE32();
    zkey.power = log2(zkey.domainSize);
    zkey.vk_alpha_1 = await readG1(fd, curve);
    zkey.vk_beta_1 = await readG1(fd, curve);
    zkey.vk_beta_2 = await readG2(fd, curve);
    zkey.vk_gamma_2 = await readG2(fd, curve);
    zkey.vk_delta_1 = await readG1(fd, curve);
    zkey.vk_delta_2 = await readG2(fd, curve);
    await endReadSection(fd);

    return zkey;

}

async function readZKey(fileName) {
    const {fd, sections} = await readBinFile(fileName, "zkey", 1);

    const zkey = await readHeader(fd, sections, "groth16");

    const Fr = new ffjavascript.F1Field(zkey.r);
    const Rr = ffjavascript.Scalar.mod(ffjavascript.Scalar.shl(1, zkey.n8r*8), zkey.r);
    const Rri = Fr.inv(Rr);
    const Rri2 = Fr.mul(Rri, Rri);

    let curve = getCurveFromQ(zkey.q);

    // Read IC Section
    ///////////
    await startReadUniqueSection(fd, sections, 3);
    zkey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const P = await readG1(fd, curve);
        zkey.IC.push(P);
    }
    await endReadSection(fd);


    // Read Coefs
    ///////////
    await startReadUniqueSection(fd, sections, 4);
    const nCCoefs = await fd.readULE32();
    zkey.ccoefs = [];
    for (let i=0; i<nCCoefs; i++) {
        const m = await fd.readULE32();
        const c = await fd.readULE32();
        const s = await fd.readULE32();
        const v = await readFr2();
        zkey.ccoefs.push({
            matrix: m,
            constraint: c,
            signal: s,
            value: v
        });
    }
    await endReadSection(fd);

    // Read A points
    ///////////
    await startReadUniqueSection(fd, sections, 5);
    zkey.A = [];
    for (let i=0; i<zkey.nVars; i++) {
        const A = await readG1(fd, curve);
        zkey.A[i] = A;
    }
    await endReadSection(fd);


    // Read B1
    ///////////
    await startReadUniqueSection(fd, sections, 6);
    zkey.B1 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B1 = await readG1(fd, curve);

        zkey.B1[i] = B1;
    }
    await endReadSection(fd);


    // Read B2 points
    ///////////
    await startReadUniqueSection(fd, sections, 7);
    zkey.B2 = [];
    for (let i=0; i<zkey.nVars; i++) {
        const B2 = await readG2(fd, curve);
        zkey.B2[i] = B2;
    }
    await endReadSection(fd);


    // Read C points
    ///////////
    await startReadUniqueSection(fd, sections, 8);
    zkey.C = [];
    for (let i=zkey.nPublic+1; i<zkey.nVars; i++) {
        const C = await readG1(fd, curve);

        zkey.C[i] = C;
    }
    await endReadSection(fd);


    // Read H points
    ///////////
    await startReadUniqueSection(fd, sections, 9);
    zkey.hExps = [];
    for (let i=0; i<zkey.domainSize; i++) {
        const H = await readG1(fd, curve);
        zkey.hExps.push(H);
    }
    await endReadSection(fd);

    await fd.close();

    return zkey;

    async function readFr2() {
        const n = await readBigInt(fd, zkey.n8r);
        return Fr.mul(n, Rri2);
    }

}


async function readContribution(fd, curve) {
    const c = {delta:{}};
    c.deltaAfter = await readG1(fd, curve);
    c.delta.g1_s = await readG1(fd, curve);
    c.delta.g1_sx = await readG1(fd, curve);
    c.delta.g2_spx = await readG2(fd, curve);
    c.transcript = await fd.read(64);
    c.type = await fd.readULE32();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await fd.read(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await fd.read(1);
            const buffStr = await fd.read(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await fd.read(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await fd.read(1);
            c.beaconHash = await fd.read(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;
}


async function readMPCParams(fd, curve, sections) {
    await startReadUniqueSection(fd, sections, 10);
    const res = { contributions: []};
    res.csHash = await fd.read(64);
    const n = await fd.readULE32();
    for (let i=0; i<n; i++) {
        const c = await readContribution(fd, curve);
        res.contributions.push(c);
    }
    await endReadSection(fd);

    return res;
}

async function writeContribution(fd, curve, c) {
    await writeG1(fd, curve, c.deltaAfter);
    await writeG1(fd, curve, c.delta.g1_s);
    await writeG1(fd, curve, c.delta.g1_sx);
    await writeG2(fd, curve, c.delta.g2_spx);
    await fd.write(c.transcript);
    await fd.writeULE32(c.type || 0);

    const params = [];
    if (c.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(c.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (c.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(c.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(c.beaconHash.byteLength);
        for (let i=0; i<c.beaconHash.byteLength; i++) params.push(c.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }

}

async function writeMPCParams(fd, curve, mpcParams) {
    await startWriteSection(fd, 10);
    await fd.write(mpcParams.csHash);
    await fd.writeULE32(mpcParams.contributions.length);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        await writeContribution(fd, curve,mpcParams.contributions[i]);
    }
    await endWriteSection(fd);
}

function hashG1(hasher, curve, p) {
    const buff = new Uint8Array(curve.G1.F.n8*2);
    curve.G1.toRprUncompressed(buff, 0, p);
    hasher.update(buff);
}

function hashG2(hasher,curve, p) {
    const buff = new Uint8Array(curve.G2.F.n8*2);
    curve.G2.toRprUncompressed(buff, 0, p);
    hasher.update(buff);
}

function hashPubKey(hasher, curve, c) {
    hashG1(hasher, curve, c.deltaAfter);
    hashG1(hasher, curve, c.delta.g1_s);
    hashG1(hasher, curve, c.delta.g1_sx);
    hashG2(hasher, curve, c.delta.g2_spx);
    hasher.update(c.transcript);
}

async function write(fd, witness, prime) {

    await startWriteSection(fd, 1);
    const n8 = (Math.floor( (ffjavascript.Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await writeBigInt(fd, prime, n8);
    await fd.writeULE32(witness.length);
    await endWriteSection(fd);

    await startWriteSection(fd, 2);
    for (let i=0; i<witness.length; i++) {
        await writeBigInt(fd, witness[i], n8);
    }
    await endWriteSection(fd);


}

async function writeBin(fd, witnessBin, prime) {

    await startWriteSection(fd, 1);
    const n8 = (Math.floor( (ffjavascript.Scalar.bitLength(prime) - 1) / 64) +1)*8;
    await fd.writeULE32(n8);
    await writeBigInt(fd, prime, n8);
    if (witnessBin.byteLength % n8 != 0) {
        throw new Error("Invalid witness length");
    }
    await fd.writeULE32(witnessBin.byteLength / n8);
    await endWriteSection(fd);


    await startWriteSection(fd, 2);
    await fd.write(witnessBin);
    await endWriteSection(fd);

}

async function readHeader$1(fd, sections) {

    await startReadUniqueSection(fd, sections, 1);
    const n8 = await fd.readULE32();
    const q = await readBigInt(fd, n8);
    const nWitness = await fd.readULE32();
    await endReadSection(fd);

    return {n8, q, nWitness};

}

async function read(fileName) {

    const {fd, sections} = await readBinFile(fileName, "wtns", 2);

    const {n8, nWitness} = await readHeader$1(fd, sections);

    await startReadUniqueSection(fd, sections, 2);
    const res = [];
    for (let i=0; i<nWitness; i++) {
        const v = await readBigInt(fd, n8);
        res.push(v);
    }
    await endReadSection(fd);

    await fd.close();

    return res;
}

const {stringifyBigInts} = ffjavascript.utils;

async function groth16Prove(zkeyFileName, witnessFileName, logger) {
    const {fd: fdWtns, sections: sectionsWtns} = await readBinFile(witnessFileName, "wtns", 2, 1<<25, 1<<23);

    const wtns = await readHeader$1(fdWtns, sectionsWtns);

    const {fd: fdZKey, sections: sectionsZKey} = await readBinFile(zkeyFileName, "zkey", 2, 1<<25, 1<<23);

    const zkey = await readHeader(fdZKey, sectionsZKey, "groth16");

    if (!ffjavascript.Scalar.eq(zkey.r,  wtns.q)) {
        throw new Error("Curve of the witness does not match the curve of the proving key");
    }

    if (wtns.nWitness != zkey.nVars) {
        throw new Error(`Invalid witness length. Circuit: ${zkey.nVars}, witness: ${wtns.nWitness}`);
    }

    const curve = await getCurveFromQ(zkey.q);
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;

    const power = log2(zkey.domainSize);

    if (logger) logger.debug("Reading Wtns");
    const buffWitness = await readSection(fdWtns, sectionsWtns, 2);
    if (logger) logger.debug("Reading Coeffs");
    const buffCoeffs = await readSection(fdZKey, sectionsZKey, 4);

    if (logger) logger.debug("Building ABC");
    const [buffA_T, buffB_T, buffC_T] = await buldABC1(curve, zkey, buffWitness, buffCoeffs, logger);

    const inc = power == Fr.s ? curve.Fr.shift : curve.Fr.w[power+1];

    const buffA = await Fr.ifft(buffA_T, "", "", logger, "IFFT_A");
    const buffAodd = await Fr.batchApplyKey(buffA, Fr.e(1), inc);
    const buffAodd_T = await Fr.fft(buffAodd, "", "", logger, "FFT_A");

    const buffB = await Fr.ifft(buffB_T, "", "", logger, "IFFT_B");
    const buffBodd = await Fr.batchApplyKey(buffB, Fr.e(1), inc);
    const buffBodd_T = await Fr.fft(buffBodd, "", "", logger, "FFT_B");

    const buffC = await Fr.ifft(buffC_T, "", "", logger, "IFFT_C");
    const buffCodd = await Fr.batchApplyKey(buffC, Fr.e(1), inc);
    const buffCodd_T = await Fr.fft(buffCodd, "", "", logger, "FFT_C");

    if (logger) logger.debug("Join ABC");
    const buffPodd_T = await joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T, logger);

    let proof = {};

    if (logger) logger.debug("Reading A Points");
    const buffBasesA = await readSection(fdZKey, sectionsZKey, 5);
    proof.pi_a = await curve.G1.multiExpAffine(buffBasesA, buffWitness, logger, "multiexp A");

    if (logger) logger.debug("Reading B1 Points");
    const buffBasesB1 = await readSection(fdZKey, sectionsZKey, 6);
    let pib1 = await curve.G1.multiExpAffine(buffBasesB1, buffWitness, logger, "multiexp B1");

    if (logger) logger.debug("Reading B2 Points");
    const buffBasesB2 = await readSection(fdZKey, sectionsZKey, 7);
    proof.pi_b = await curve.G2.multiExpAffine(buffBasesB2, buffWitness, logger, "multiexp B2");

    if (logger) logger.debug("Reading C Points");
    const buffBasesC = await readSection(fdZKey, sectionsZKey, 8);
    proof.pi_c = await curve.G1.multiExpAffine(buffBasesC, buffWitness.slice((zkey.nPublic+1)*curve.Fr.n8), logger, "multiexp C");

    if (logger) logger.debug("Reading H Points");
    const buffBasesH = await readSection(fdZKey, sectionsZKey, 9);
    const resH = await curve.G1.multiExpAffine(buffBasesH, buffPodd_T, logger, "multiexp H");

    const r = curve.Fr.random();
    const s = curve.Fr.random();

    proof.pi_a  = G1.add( proof.pi_a, zkey.vk_alpha_1 );
    proof.pi_a  = G1.add( proof.pi_a, G1.timesFr( zkey.vk_delta_1, r ));

    proof.pi_b  = G2.add( proof.pi_b, zkey.vk_beta_2 );
    proof.pi_b  = G2.add( proof.pi_b, G2.timesFr( zkey.vk_delta_2, s ));

    pib1 = G1.add( pib1, zkey.vk_beta_1 );
    pib1 = G1.add( pib1, G1.timesFr( zkey.vk_delta_1, s ));

    proof.pi_c = G1.add(proof.pi_c, resH);


    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( proof.pi_a, s ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( pib1, r ));
    proof.pi_c  = G1.add( proof.pi_c, G1.timesFr( zkey.vk_delta_1, Fr.neg(Fr.mul(r,s) )));


    let publicSignals = [];

    for (let i=1; i<= zkey.nPublic; i++) {
        const b = buffWitness.slice(i*Fr.n8, i*Fr.n8+Fr.n8);
        publicSignals.push(ffjavascript.Scalar.fromRprLE(b));
    }

    proof.pi_a = G1.toObject(G1.toAffine(proof.pi_a));
    proof.pi_b = G2.toObject(G2.toAffine(proof.pi_b));
    proof.pi_c = G1.toObject(G1.toAffine(proof.pi_c));

    proof.protocol = "groth16";

    await fdZKey.close();
    await fdWtns.close();

    proof = stringifyBigInts(proof);
    publicSignals = stringifyBigInts(publicSignals);

    return {proof, publicSignals};
}


async function buldABC1(curve, zkey, witness, coeffs, logger) {
    const n8 = curve.Fr.n8;
    const sCoef = 4*3 + zkey.n8r;
    const nCoef = (coeffs.byteLength-4) / sCoef;

    const outBuffA = new ffjavascript.BigBuffer(zkey.domainSize * n8);
    const outBuffB = new ffjavascript.BigBuffer(zkey.domainSize * n8);
    const outBuffC = new ffjavascript.BigBuffer(zkey.domainSize * n8);

    const outBuf = [ outBuffA, outBuffB ];
    for (let i=0; i<nCoef; i++) {
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP AB: ${i}/${nCoef}`);
        const buffCoef = coeffs.slice(4+i*sCoef, 4+i*sCoef+sCoef);
        const buffCoefV = new DataView(buffCoef.buffer);
        const m= buffCoefV.getUint32(0, true);
        const c= buffCoefV.getUint32(4, true);
        const s= buffCoefV.getUint32(8, true);
        const coef = buffCoef.slice(12, 12+n8);
        outBuf[m].set(
            curve.Fr.add(
                outBuf[m].slice(c*n8, c*n8+n8),
                curve.Fr.mul(coef, witness.slice(s*n8, s*n8+n8))
            ),
            c*n8
        );
    }

    for (let i=0; i<zkey.domainSize; i++) {
        if ((logger)&&(i%1000000 == 0)) logger.debug(`QAP C: ${i}/${zkey.domainSize}`);
        outBuffC.set(
            curve.Fr.mul(
                outBuffA.slice(i*n8, i*n8+n8),
                outBuffB.slice(i*n8, i*n8+n8),
            ),
            i*n8
        );
    }

    return [outBuffA, outBuffB, outBuffC];

}


async function joinABC(curve, zkey, a, b, c, logger) {
    const MAX_CHUNK_SIZE = 1 << 22;

    const n8 = curve.Fr.n8;
    const nElements = Math.floor(a.byteLength / curve.Fr.n8);

    const promises = [];

    for (let i=0; i<nElements; i += MAX_CHUNK_SIZE) {
        if (logger) logger.debug(`JoinABC: ${i}/${nElements}`);
        const n= Math.min(nElements - i, MAX_CHUNK_SIZE);

        const task = [];

        const aChunk = a.slice(i*n8, (i + n)*n8 );
        const bChunk = b.slice(i*n8, (i + n)*n8 );
        const cChunk = c.slice(i*n8, (i + n)*n8 );

        task.push({cmd: "ALLOCSET", var: 0, buff: aChunk});
        task.push({cmd: "ALLOCSET", var: 1, buff: bChunk});
        task.push({cmd: "ALLOCSET", var: 2, buff: cChunk});
        task.push({cmd: "ALLOC", var: 3, len: n*n8});
        task.push({cmd: "CALL", fnName: "qap_joinABC", params:[
            {var: 0},
            {var: 1},
            {var: 2},
            {val: n},
            {var: 3},
        ]});
        task.push({cmd: "CALL", fnName: "frm_batchFromMontgomery", params:[
            {var: 3},
            {val: n},
            {var: 3}
        ]});
        task.push({cmd: "GET", out: 0, var: 3, len: n*n8});
        promises.push(curve.tm.queueAction(task));
    }

    const result = await Promise.all(promises);

    let outBuff;
    if (a instanceof ffjavascript.BigBuffer) {
        outBuff = new ffjavascript.BigBuffer(a.byteLength);
    } else {
        outBuff = new Uint8Array(a.byteLength);
    }

    let p=0;
    for (let i=0; i<result.length; i++) {
        outBuff.set(result[i][0], p);
        p += result[i][0].byteLength;
    }

    return outBuff;
}

const { WitnessCalculatorBuilder } = circomRuntime;

async function wtnsCalculate(input, wasmFileName, wtnsFileName, options) {

    const fdWasm = await readExisting$2(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();

    const wc = await WitnessCalculatorBuilder(wasm);
    const w = await wc.calculateBinWitness(input);

    const fdWtns = await createBinFile(wtnsFileName, "wtns", 2, 2);

    await writeBin(fdWtns, w, wc.prime);
    await fdWtns.close();

}

async function groth16FullProve(input, wasmFile, zkeyFileName, logger) {
    const wtns= {
        type: "mem"
    };
    await wtnsCalculate(input, wasmFile, wtns);
    return await groth16Prove(zkeyFileName, wtns, logger);
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/
const {unstringifyBigInts} = ffjavascript.utils;

async function groth16Verify(vk_verifier, publicSignals, proof, logger) {
/*
    let cpub = vk_verifier.IC[0];
    for (let s= 0; s< vk_verifier.nPublic; s++) {
        cpub  = G1.add( cpub, G1.timesScalar( vk_verifier.IC[s+1], publicSignals[s]));
    }
*/

    vk_verifier = unstringifyBigInts(vk_verifier);
    proof = unstringifyBigInts(proof);
    publicSignals = unstringifyBigInts(publicSignals);

    const curve = await getCurveFromName(vk_verifier.curve);

    const IC0 = curve.G1.fromObject(vk_verifier.IC[0]);
    const IC = new Uint8Array(curve.G1.F.n8*2 * publicSignals.length);
    const w = new Uint8Array(curve.Fr.n8 * publicSignals.length);

    for (let i=0; i<publicSignals.length; i++) {
        const buffP = curve.G1.fromObject(vk_verifier.IC[i+1]);
        IC.set(buffP, i*curve.G1.F.n8*2);
        ffjavascript.Scalar.toRprLE(w, curve.Fr.n8*i, publicSignals[i], curve.Fr.n8);
    }

    let cpub = await curve.G1.multiExpAffine(IC, w);
    cpub = curve.G1.add(cpub, IC0);

    const pi_a = curve.G1.fromObject(proof.pi_a);
    const pi_b = curve.G2.fromObject(proof.pi_b);
    const pi_c = curve.G1.fromObject(proof.pi_c);

    const vk_gamma_2 = curve.G2.fromObject(vk_verifier.vk_gamma_2);
    const vk_delta_2 = curve.G2.fromObject(vk_verifier.vk_delta_2);
    const vk_alpha_1 = curve.G1.fromObject(vk_verifier.vk_alpha_1);
    const vk_beta_2 = curve.G2.fromObject(vk_verifier.vk_beta_2);

    const res = await curve.pairingEq(
        curve.G1.neg(pi_a) , pi_b,
        cpub , vk_gamma_2,
        pi_c , vk_delta_2,

        vk_alpha_1, vk_beta_2
    );

    if (! res) {
        if (logger) logger.error("Invalid proof");
        return false;
    }

    if (logger) logger.info("OK!");
    return true;
}

var groth16 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fullProve: groth16FullProve,
    prove: groth16Prove,
    verify: groth16Verify
});

function hashToG2(curve, hash) {
    const hashV = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed[i] = hashV.getUint32(i*4);
    }

    const rng = new ffjavascript.ChaCha(seed);

    const g2_sp = curve.G2.fromRng(rng);

    return g2_sp;
}

function getG2sp(curve, persinalization, challenge, g1s, g1sx) {

    const h = Blake2b(64);
    const b1 = new Uint8Array([persinalization]);
    h.update(b1);
    h.update(challenge);
    const b3 = curve.G1.toUncompressed(g1s);
    h.update( b3);
    const b4 = curve.G1.toUncompressed(g1sx);
    h.update( b4);
    const hash =h.digest();

    return hashToG2(curve, hash);
}

function calculatePubKey(k, curve, personalization, challengeHash, rng ) {
    k.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    k.g1_sx = curve.G1.toAffine(curve.G1.timesFr(k.g1_s, k.prvKey));
    k.g2_sp = curve.G2.toAffine(getG2sp(curve, personalization, challengeHash, k.g1_s, k.g1_sx));
    k.g2_spx = curve.G2.toAffine(curve.G2.timesFr(k.g2_sp, k.prvKey));
    return k;
}

function createPTauKey(curve, challengeHash, rng) {
    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };
    key.tau.prvKey = curve.Fr.fromRng(rng);
    key.alpha.prvKey = curve.Fr.fromRng(rng);
    key.beta.prvKey = curve.Fr.fromRng(rng);
    calculatePubKey(key.tau, curve, 0, challengeHash, rng);
    calculatePubKey(key.alpha, curve, 1, challengeHash, rng);
    calculatePubKey(key.beta, curve, 2, challengeHash, rng);
    return key;
}

async function writePTauHeader(fd, curve, power, ceremonyPower) {
    // Write the header
    ///////////

    if (! ceremonyPower) ceremonyPower = power;
    await fd.writeULE32(1); // Header type
    const pHeaderSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(curve.F1.n64*8);

    const buff = new Uint8Array(curve.F1.n8);
    ffjavascript.Scalar.toRprLE(buff, 0, curve.q, curve.F1.n8);
    await fd.write(buff);
    await fd.writeULE32(power);                    // power
    await fd.writeULE32(ceremonyPower);               // power

    const headerSize = fd.pos - pHeaderSize - 8;

    const oldPos = fd.pos;

    await fd.writeULE64(headerSize, pHeaderSize);

    fd.pos = oldPos;
}

async function readPTauHeader(fd, sections) {
    if (!sections[1])  throw new Error(fd.fileName + ": File has no  header");
    if (sections[1].length>1) throw new Error(fd.fileName +": File has more than one header");

    fd.pos = sections[1][0].p;
    const n8 = await fd.readULE32();
    const buff = await fd.read(n8);
    const q = ffjavascript.Scalar.fromRprLE(buff);

    const curve = await getCurveFromQ(q);

    if (curve.F1.n64*8 != n8) throw new Error(fd.fileName +": Invalid size");

    const power = await fd.readULE32();
    const ceremonyPower = await fd.readULE32();

    if (fd.pos-sections[1][0].p != sections[1][0].size) throw new Error("Invalid PTau header size");

    return {curve, power, ceremonyPower};
}


async function readPtauPubKey(fd, curve, montgomery) {

    const buff = await fd.read(curve.F1.n8*2*6 + curve.F2.n8*2*3);

    return fromPtauPubKeyRpr(buff, 0, curve, montgomery);
}

function fromPtauPubKeyRpr(buff, pos, curve, montgomery) {

    const key = {
        tau: {},
        alpha: {},
        beta: {}
    };

    key.tau.g1_s = readG1();
    key.tau.g1_sx = readG1();
    key.alpha.g1_s = readG1();
    key.alpha.g1_sx = readG1();
    key.beta.g1_s = readG1();
    key.beta.g1_sx = readG1();
    key.tau.g2_spx = readG2();
    key.alpha.g2_spx = readG2();
    key.beta.g2_spx = readG2();

    return key;

    function readG1() {
        let p;
        if (montgomery) {
            p = curve.G1.fromRprLEM( buff, pos );
        } else {
            p = curve.G1.fromRprUncompressed( buff, pos );
        }
        pos += curve.G1.F.n8*2;
        return p;
    }

    function readG2() {
        let p;
        if (montgomery) {
            p = curve.G2.fromRprLEM( buff, pos );
        } else {
            p = curve.G2.fromRprUncompressed( buff, pos );
        }
        pos += curve.G2.F.n8*2;
        return p;
    }
}

function toPtauPubKeyRpr(buff, pos, curve, key, montgomery) {

    writeG1(key.tau.g1_s);
    writeG1(key.tau.g1_sx);
    writeG1(key.alpha.g1_s);
    writeG1(key.alpha.g1_sx);
    writeG1(key.beta.g1_s);
    writeG1(key.beta.g1_sx);
    writeG2(key.tau.g2_spx);
    writeG2(key.alpha.g2_spx);
    writeG2(key.beta.g2_spx);

    async function writeG1(p) {
        if (montgomery) {
            curve.G1.toRprLEM(buff, pos, p);
        } else {
            curve.G1.toRprUncompressed(buff, pos, p);
        }
        pos += curve.F1.n8*2;
    }

    async function writeG2(p) {
        if (montgomery) {
            curve.G2.toRprLEM(buff, pos, p);
        } else {
            curve.G2.toRprUncompressed(buff, pos, p);
        }
        pos += curve.F2.n8*2;
    }

    return buff;
}

async function writePtauPubKey(fd, curve, key, montgomery) {
    const buff = new Uint8Array(curve.F1.n8*2*6 + curve.F2.n8*2*3);
    toPtauPubKeyRpr(buff, 0, curve, key, montgomery);
    await fd.write(buff);
}

async function readContribution$1(fd, curve) {
    const c = {};

    c.tauG1 = await readG1();
    c.tauG2 = await readG2();
    c.alphaG1 = await readG1();
    c.betaG1 = await readG1();
    c.betaG2 = await readG2();
    c.key = await readPtauPubKey(fd, curve, true);
    c.partialHash = await fd.read(216);
    c.nextChallenge = await fd.read(64);
    c.type = await fd.readULE32();

    const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
    toPtauPubKeyRpr(buffV, 0, curve, c.key, false);

    const responseHasher = Blake2b(64);
    responseHasher.setPartialHash(c.partialHash);
    responseHasher.update(buffV);
    c.responseHash = responseHasher.digest();

    const paramLength = await fd.readULE32();
    const curPos = fd.pos;
    let lastType =0;
    while (fd.pos-curPos < paramLength) {
        const buffType = await readDV(1);
        if (buffType[0]<= lastType) throw new Error("Parameters in the contribution must be sorted");
        lastType = buffType[0];
        if (buffType[0]==1) {     // Name
            const buffLen = await readDV(1);
            const buffStr = await readDV(buffLen[0]);
            c.name = new TextDecoder().decode(buffStr);
        } else if (buffType[0]==2) {
            const buffExp = await readDV(1);
            c.numIterationsExp = buffExp[0];
        } else if (buffType[0]==3) {
            const buffLen = await readDV(1);
            c.beaconHash = await readDV(buffLen[0]);
        } else {
            throw new Error("Parameter not recognized");
        }
    }
    if (fd.pos != curPos + paramLength) {
        throw new Error("Parametes do not match");
    }

    return c;

    async function readG1() {
        const pBuff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprLEM( pBuff );
    }

    async function readG2() {
        const pBuff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprLEM( pBuff );
    }

    async function readDV(n) {
        const b = await fd.read(n);
        return new Uint8Array(b);
    }
}

async function readContributions(fd, curve, sections) {
    if (!sections[7])  throw new Error(fd.fileName + ": File has no  contributions");
    if (sections[7][0].length>1) throw new Error(fd.fileName +": File has more than one contributions section");

    fd.pos = sections[7][0].p;
    const nContributions = await fd.readULE32();
    const contributions = [];
    for (let i=0; i<nContributions; i++) {
        const c = await readContribution$1(fd, curve);
        c.id = i+1;
        contributions.push(c);
    }

    if (fd.pos-sections[7][0].p != sections[7][0].size) throw new Error("Invalid contribution section size");

    return contributions;
}

async function writeContribution$1(fd, curve, contribution) {

    const buffG1 = new Uint8Array(curve.F1.n8*2);
    const buffG2 = new Uint8Array(curve.F2.n8*2);
    await writeG1(contribution.tauG1);
    await writeG2(contribution.tauG2);
    await writeG1(contribution.alphaG1);
    await writeG1(contribution.betaG1);
    await writeG2(contribution.betaG2);
    await writePtauPubKey(fd, curve, contribution.key, true);
    await fd.write(contribution.partialHash);
    await fd.write(contribution.nextChallenge);
    await fd.writeULE32(contribution.type || 0);

    const params = [];
    if (contribution.name) {
        params.push(1);      // Param Name
        const nameData = new TextEncoder("utf-8").encode(contribution.name.substring(0,64));
        params.push(nameData.byteLength);
        for (let i=0; i<nameData.byteLength; i++) params.push(nameData[i]);
    }
    if (contribution.type == 1) {
        params.push(2);      // Param numIterationsExp
        params.push(contribution.numIterationsExp);

        params.push(3);      // Beacon Hash
        params.push(contribution.beaconHash.byteLength);
        for (let i=0; i<contribution.beaconHash.byteLength; i++) params.push(contribution.beaconHash[i]);
    }
    if (params.length>0) {
        const paramsBuff = new Uint8Array(params);
        await fd.writeULE32(paramsBuff.byteLength);
        await fd.write(paramsBuff);
    } else {
        await fd.writeULE32(0);
    }


    async function writeG1(p) {
        curve.G1.toRprLEM(buffG1, 0, p);
        await fd.write(buffG1);
    }

    async function writeG2(p) {
        curve.G2.toRprLEM(buffG2, 0, p);
        await fd.write(buffG2);
    }

}

async function writeContributions(fd, curve, contributions) {

    await fd.writeULE32(7); // Header type
    const pContributionsSize = fd.pos;
    await fd.writeULE64(0); // Temporally set to 0 length

    await fd.writeULE32(contributions.length);
    for (let i=0; i< contributions.length; i++) {
        await writeContribution$1(fd, curve, contributions[i]);
    }
    const contributionsSize = fd.pos - pContributionsSize - 8;

    const oldPos = fd.pos;

    await fd.writeULE64(contributionsSize, pContributionsSize);
    fd.pos = oldPos;
}

function calculateFirstChallengeHash(curve, power, logger) {
    if (logger) logger.debug("Calculating First Challenge Hash");

    const hasher = new Blake2b(64);

    const vG1 = new Uint8Array(curve.G1.F.n8*2);
    const vG2 = new Uint8Array(curve.G2.F.n8*2);
    curve.G1.toRprUncompressed(vG1, 0, curve.G1.g);
    curve.G2.toRprUncompressed(vG2, 0, curve.G2.g);

    hasher.update(Blake2b(64).digest());

    let n;

    n=(2 ** power)*2 -1;
    if (logger) logger.debug("Calculate Initial Hash: tauG1");
    hashBlock(vG1, n);
    n= 2 ** power;
    if (logger) logger.debug("Calculate Initial Hash: tauG2");
    hashBlock(vG2, n);
    if (logger) logger.debug("Calculate Initial Hash: alphaTauG1");
    hashBlock(vG1, n);
    if (logger) logger.debug("Calculate Initial Hash: betaTauG1");
    hashBlock(vG1, n);
    hasher.update(vG2);

    return hasher.digest();

    function hashBlock(buff, n) {
        const blockSize = 500000;
        const nBlocks = Math.floor(n / blockSize);
        const rem = n % blockSize;
        const bigBuff = new Uint8Array(blockSize * buff.byteLength);
        for (let i=0; i<blockSize; i++) {
            bigBuff.set(buff, i*buff.byteLength);
        }
        for (let i=0; i<nBlocks; i++) {
            hasher.update(bigBuff);
            if (logger) logger.debug("Initial hash: " +i*blockSize);
        }
        for (let i=0; i<rem; i++) {
            hasher.update(buff);
        }
    }
}


function keyFromBeacon(curve, challengeHash, beaconHash, numIterationsExp) {

    const rng = rngFromBeaconParams(beaconHash, numIterationsExp);

    const key = createPTauKey(curve, challengeHash, rng);

    return key;
}

/*
Header(1)
    n8
    prime
    power
tauG1(2)
    {(2 ** power)*2-1} [
        G1, tau*G1, tau^2 * G1, ....
    ]
tauG2(3)
    {2 ** power}[
        G2, tau*G2, tau^2 * G2, ...
    ]
alphaTauG1(4)
    {2 ** power}[
        alpha*G1, alpha*tau*G1, alpha*tau^2*G1,....
    ]
betaTauG1(5)
    {2 ** power} []
        beta*G1, beta*tau*G1, beta*tau^2*G1, ....
    ]
betaG2(6)
    {1}[
        beta*G2
    ]
contributions(7)
    NContributions
    {NContributions}[
        tau*G1
        tau*G2
        alpha*G1
        beta*G1
        beta*G2
        pubKey
            tau_g1s
            tau_g1sx
            tau_g2spx
            alpha_g1s
            alpha_g1sx
            alpha_g1spx
            beta_g1s
            beta_g1sx
            beta_g1spx
        partialHash (216 bytes) See https://github.com/mafintosh/blake2b-wasm/blob/23bee06945806309977af802bc374727542617c7/blake2b.wat#L9
        hashNewChallenge
    ]
 */

async function newAccumulator(curve, power, fileName, logger) {

    await Blake2b.ready();

    const fd = await createBinFile(fileName, "ptau", 1, 7);

    await writePTauHeader(fd, curve, power, 0);

    const buffG1 = curve.G1.oneAffine;
    const buffG2 = curve.G2.oneAffine;

    // Write tauG1
    ///////////
    await startWriteSection(fd, 2);
    const nTauG1 = (2 ** power) * 2 -1;
    for (let i=0; i< nTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG1: " + i);
    }
    await endWriteSection(fd);

    // Write tauG2
    ///////////
    await startWriteSection(fd, 3);
    const nTauG2 = (2 ** power);
    for (let i=0; i< nTauG2; i++) {
        await fd.write(buffG2);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("tauG2: " + i);
    }
    await endWriteSection(fd);

    // Write alphaTauG1
    ///////////
    await startWriteSection(fd, 4);
    const nAlfaTauG1 = (2 ** power);
    for (let i=0; i< nAlfaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("alphaTauG1: " + i);
    }
    await endWriteSection(fd);

    // Write betaTauG1
    ///////////
    await startWriteSection(fd, 5);
    const nBetaTauG1 = (2 ** power);
    for (let i=0; i< nBetaTauG1; i++) {
        await fd.write(buffG1);
        if ((logger)&&((i%100000) == 0)&&i) logger.log("betaTauG1: " + i);
    }
    await endWriteSection(fd);

    // Write betaG2
    ///////////
    await startWriteSection(fd, 6);
    await fd.write(buffG2);
    await endWriteSection(fd);

    // Contributions
    ///////////
    await startWriteSection(fd, 7);
    await fd.writeULE32(0); // 0 Contributions
    await endWriteSection(fd);

    await fd.close();

    const firstChallengeHash = calculateFirstChallengeHash(curve, power, logger);

    if (logger) logger.debug(formatHash(Blake2b(64).digest(), "Blank Contribution Hash:"));

    if (logger) logger.info(formatHash(firstChallengeHash, "First Contribution Hash:"));

    return firstChallengeHash;

}

// Format of the outpu

async function exportChallenge(pTauFilename, challengeFilename, logger) {
    await Blake2b.ready();
    const {fd: fdFrom, sections} = await readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await readPTauHeader(fdFrom, sections);

    const contributions = await readContributions(fdFrom, curve, sections);
    let lastResponseHash, curChallengeHash;
    if (contributions.length == 0) {
        lastResponseHash = Blake2b(64).digest();
        curChallengeHash = calculateFirstChallengeHash(curve, power);
    } else {
        lastResponseHash = contributions[contributions.length-1].responseHash;
        curChallengeHash = contributions[contributions.length-1].nextChallenge;
    }

    if (logger) logger.info(formatHash(lastResponseHash, "Last Response Hash: "));

    if (logger) logger.info(formatHash(curChallengeHash, "New Challenge Hash: "));


    const fdTo = await createOverride(challengeFilename);

    const toHash = Blake2b(64);
    await fdTo.write(lastResponseHash);
    toHash.update(lastResponseHash);

    await exportSection(2, "G1", (2 ** power) * 2 -1, "tauG1");
    await exportSection(3, "G2", (2 ** power)       , "tauG2");
    await exportSection(4, "G1", (2 ** power)       , "alphaTauG1");
    await exportSection(5, "G1", (2 ** power)       , "betaTauG1");
    await exportSection(6, "G2", 1                  , "betaG2");

    await fdFrom.close();
    await fdTo.close();

    const calcCurChallengeHash = toHash.digest();

    if (!hashIsEqual (curChallengeHash, calcCurChallengeHash)) {
        if (logger) logger.info(formatHash(calcCurChallengeHash, "Calc Curret Challenge Hash: "));

        if (logger) logger.error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
        throw new Error("PTau file is corrupted. Calculated new challenge hash does not match with the eclared one");
    }

    return curChallengeHash;

    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        await startReadUniqueSection(fdFrom, sections, sectionId);
        for (let i=0; i< nPoints; i+= nPointsChunk) {
            if (logger) logger.debug(`Exporting ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);
            let buff;
            buff = await fdFrom.read(n*sG);
            buff = await G.batchLEMtoU(buff);
            await fdTo.write(buff);
            toHash.update(buff);
        }
        await endReadSection(fdFrom);
    }


}

async function importResponse(oldPtauFilename, contributionFilename, newPTauFilename, name, importPoints, logger) {

    await Blake2b.ready();

    const noHash = new Uint8Array(64);
    for (let i=0; i<64; i++) noHash[i] = 0xFF;

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);
    const contributions = await readContributions(fdOld, curve, sections);
    const currentContribution = {};

    if (name) currentContribution.name = name;

    const sG1 = curve.F1.n8*2;
    const scG1 = curve.F1.n8; // Compresed size
    const sG2 = curve.F2.n8*2;
    const scG2 = curve.F2.n8; // Compresed size

    const fdResponse = await readExisting$2(contributionFilename);

    if  (fdResponse.totalSize !=
        64 +                            // Old Hash
        ((2 ** power)*2-1)*scG1 +
        (2 ** power)*scG2 +
        (2 ** power)*scG1 +
        (2 ** power)*scG1 +
        scG2 +
        sG1*6 + sG2*3)
        throw new Error("Size of the contribution is invalid");

    let lastChallengeHash;

    if (contributions.length>0) {
        lastChallengeHash = contributions[contributions.length-1].nextChallenge;
    } else {
        lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
    }

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, importPoints ? 7: 2);
    await writePTauHeader(fdNew, curve, power);

    const contributionPreviousHash = await fdResponse.read(64);

    if (hashIsEqual(noHash,lastChallengeHash)) {
        lastChallengeHash = contributionPreviousHash;
        contributions[contributions.length-1].nextChallenge = lastChallengeHash;
    }

    if(!hashIsEqual(contributionPreviousHash,lastChallengeHash))
        throw new Error("Wrong contribution. this contribution is not based on the previus hash");

    const hasherResponse = new Blake2b(64);
    hasherResponse.update(contributionPreviousHash);

    const startSections = [];
    let res;
    res = await processSection(fdResponse, fdNew, "G1", 2, (2 ** power) * 2 -1, [1], "tauG1");
    currentContribution.tauG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 3, (2 ** power)       , [1], "tauG2");
    currentContribution.tauG2 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 4, (2 ** power)       , [0], "alphaG1");
    currentContribution.alphaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G1", 5, (2 ** power)       , [0], "betaG1");
    currentContribution.betaG1 = res[0];
    res = await processSection(fdResponse, fdNew, "G2", 6, 1                  , [0], "betaG2");
    currentContribution.betaG2 = res[0];

    currentContribution.partialHash = hasherResponse.getPartialHash();


    const buffKey = await fdResponse.read(curve.F1.n8*2*6+curve.F2.n8*2*3);

    currentContribution.key = fromPtauPubKeyRpr(buffKey, 0, curve, false);

    hasherResponse.update(new Uint8Array(buffKey));
    const hashResponse = hasherResponse.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    if (importPoints) {
        const nextChallengeHasher = new Blake2b(64);
        nextChallengeHasher.update(hashResponse);

        await hashSection(nextChallengeHasher, fdNew, "G1", 2, (2 ** power) * 2 -1, "tauG1", logger);
        await hashSection(nextChallengeHasher, fdNew, "G2", 3, (2 ** power)       , "tauG2", logger);
        await hashSection(nextChallengeHasher, fdNew, "G1", 4, (2 ** power)       , "alphaTauG1", logger);
        await hashSection(nextChallengeHasher, fdNew, "G1", 5, (2 ** power)       , "betaTauG1", logger);
        await hashSection(nextChallengeHasher, fdNew, "G2", 6, 1                  , "betaG2", logger);

        currentContribution.nextChallenge = nextChallengeHasher.digest();

        if (logger) logger.info(formatHash(currentContribution.nextChallenge, "Next Challenge Hash: "));
    } else {
        currentContribution.nextChallenge = noHash;
    }

    contributions.push(currentContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdResponse.close();
    await fdNew.close();
    await fdOld.close();

    return currentContribution.nextChallenge;

    async function processSection(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {
        if (importPoints) {
            return await processSectionImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName);
        } else {
            return await processSectionNoImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName);
        }
    }

    async function processSectionImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;
        const sG = G.F.n8*2;

        const singularPoints = [];

        await startWriteSection(fdTo, sectionId);
        const nPointsChunk = Math.floor((1<<24)/sG);

        startSections[sectionId] = fdTo.pos;

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffC = await fdFrom.read(n * scG);
            hasherResponse.update(buffC);

            const buffLEM = await G.batchCtoLEM(buffC);

            await fdTo.write(buffLEM);
            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(buffLEM, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }
        }

        await endWriteSection(fdTo);

        return singularPoints;
    }


    async function processSectionNoImportPoints(fdFrom, fdTo, groupName, sectionId, nPoints, singularPointIndexes, sectionName) {

        const G = curve[groupName];
        const scG = G.F.n8;

        const singularPoints = [];

        const nPointsChunk = Math.floor((1<<24)/scG);

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Importing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffC = await fdFrom.read(n * scG);
            hasherResponse.update(buffC);

            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprCompressed(buffC, (sp-i)*scG);
                    singularPoints.push(P);
                }
            }
        }

        return singularPoints;
    }


    async function hashSection(nextChallengeHasher, fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallengeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }

}

const sameRatio$1 = sameRatio;

async function verifyContribution(curve, cur, prev, logger) {
    let sr;
    if (cur.type == 1) {    // Verify the beacon.
        const beaconKey = keyFromBeacon(curve, prev.nextChallenge, cur.beaconHash, cur.numIterationsExp);

        if (!curve.G1.eq(cur.key.tau.g1_s, beaconKey.tau.g1_s)) {
            if (logger) logger.error(`BEACON key (tauG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.tau.g1_sx, beaconKey.tau.g1_sx)) {
            if (logger) logger.error(`BEACON key (tauG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.tau.g2_spx, beaconKey.tau.g2_spx)) {
            if (logger) logger.error(`BEACON key (tauG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.alpha.g1_s, beaconKey.alpha.g1_s)) {
            if (logger) logger.error(`BEACON key (alphaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.alpha.g1_sx, beaconKey.alpha.g1_sx)) {
            if (logger) logger.error(`BEACON key (alphaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.alpha.g2_spx, beaconKey.alpha.g2_spx)) {
            if (logger) logger.error(`BEACON key (alphaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }

        if (!curve.G1.eq(cur.key.beta.g1_s, beaconKey.beta.g1_s)) {
            if (logger) logger.error(`BEACON key (betaG1_s) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G1.eq(cur.key.beta.g1_sx, beaconKey.beta.g1_sx)) {
            if (logger) logger.error(`BEACON key (betaG1_sx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
        if (!curve.G2.eq(cur.key.beta.g2_spx, beaconKey.beta.g2_spx)) {
            if (logger) logger.error(`BEACON key (betaG2_spx) is not generated correctly in challenge #${cur.id}  ${cur.name || ""}` );
            return false;
        }
    }

    cur.key.tau.g2_sp = curve.G2.toAffine(getG2sp(curve, 0, prev.nextChallenge, cur.key.tau.g1_s, cur.key.tau.g1_sx));
    cur.key.alpha.g2_sp = curve.G2.toAffine(getG2sp(curve, 1, prev.nextChallenge, cur.key.alpha.g1_s, cur.key.alpha.g1_sx));
    cur.key.beta.g2_sp = curve.G2.toAffine(getG2sp(curve, 2, prev.nextChallenge, cur.key.beta.g1_s, cur.key.beta.g1_sx));

    sr = await sameRatio$1(curve, cur.key.tau.g1_s, cur.key.tau.g1_sx, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (tau) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, cur.key.alpha.g1_s, cur.key.alpha.g1_sx, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (alpha) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, cur.key.beta.g1_s, cur.key.beta.g1_sx, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID key (beta) in challenge #"+cur.id);
        return false;
    }

    sr = await sameRatio$1(curve, prev.tauG1, cur.tauG1, cur.key.tau.g2_sp, cur.key.tau.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve,  cur.key.tau.g1_s, cur.key.tau.g1_sx, prev.tauG2, cur.tauG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID tau*G2. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve, prev.alphaG1, cur.alphaG1, cur.key.alpha.g2_sp, cur.key.alpha.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID alpha*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve, prev.betaG1, cur.betaG1, cur.key.beta.g2_sp, cur.key.beta.g2_spx);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G1. challenge #"+cur.id+" It does not follow the previous contribution");
        return false;
    }

    sr = await sameRatio$1(curve,  cur.key.beta.g1_s, cur.key.beta.g1_sx, prev.betaG2, cur.betaG2);
    if (sr !== true) {
        if (logger) logger.error("INVALID beta*G2. challenge #"+cur.id+"It does not follow the previous contribution");
        return false;
    }

    if (logger) logger.info("Powers Of tau file OK!");
    return true;
}

async function verify(tauFilename, logger) {
    let sr;
    await Blake2b.ready();

    const {fd, sections} = await readBinFile(tauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fd, sections);
    const contrs = await readContributions(fd, curve, sections);

    if (logger) logger.debug("power: 2**" + power);
    // Verify Last contribution

    if (logger) logger.debug("Computing initial contribution hash");
    const initialContribution = {
        tauG1: curve.G1.g,
        tauG2: curve.G2.g,
        alphaG1: curve.G1.g,
        betaG1: curve.G1.g,
        betaG2: curve.G2.g,
        nextChallenge: calculateFirstChallengeHash(curve, ceremonyPower, logger),
        responseHash: Blake2b(64).digest()
    };

    if (contrs.length == 0) {
        if (logger) logger.error("This file has no contribution! It cannot be used in production");
        return false;
    }

    let prevContr;
    if (contrs.length>1) {
        prevContr = contrs[contrs.length-2];
    } else {
        prevContr = initialContribution;
    }
    const curContr = contrs[contrs.length-1];
    if (logger) logger.debug("Validating contribution #"+contrs[contrs.length-1].id);
    const res = await verifyContribution(curve, curContr, prevContr, logger);
    if (!res) return false;


    const nextContributionHasher = Blake2b(64);
    nextContributionHasher.update(curContr.responseHash);

    // Verify powers and compute nextChallengeHash

    // await test();

    // Verify Section tau*G1
    if (logger) logger.debug("Verifying powers in tau*G1 section");
    const rTau1 = await processSection(2, "G1", "tauG1", (2 ** power)*2-1, [0, 1], logger);
    sr = await sameRatio$1(curve, rTau1.R1, rTau1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("tauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curve.G1.g, rTau1.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G1 section must be the generator");
        return false;
    }
    if (!curve.G1.eq(curContr.tauG1, rTau1.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G1 section does not match the one in the contribution section");
        return false;
    }

    // await test();

    // Verify Section tau*G2
    if (logger) logger.debug("Verifying powers in tau*G2 section");
    const rTau2 = await processSection(3, "G2", "tauG2", 2 ** power, [0, 1],  logger);
    sr = await sameRatio$1(curve, curve.G1.g, curContr.tauG1, rTau2.R1, rTau2.R2);
    if (sr !== true) {
        if (logger) logger.error("tauG2 section. Powers do not match");
        return false;
    }
    if (!curve.G2.eq(curve.G2.g, rTau2.singularPoints[0])) {
        if (logger) logger.error("First element of tau*G2 section must be the generator");
        return false;
    }
    if (!curve.G2.eq(curContr.tauG2, rTau2.singularPoints[1])) {
        if (logger) logger.error("Second element of tau*G2 section does not match the one in the contribution section");
        return false;
    }

    // Verify Section alpha*tau*G1
    if (logger) logger.debug("Verifying powers in alpha*tau*G1 section");
    const rAlphaTauG1 = await processSection(4, "G1", "alphatauG1", 2 ** power, [0], logger);
    sr = await sameRatio$1(curve, rAlphaTauG1.R1, rAlphaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("alphaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.alphaG1, rAlphaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of alpha*tau*G1 section (alpha*G1) does not match the one in the contribution section");
        return false;
    }

    // Verify Section beta*tau*G1
    if (logger) logger.debug("Verifying powers in beta*tau*G1 section");
    const rBetaTauG1 = await processSection(5, "G1", "betatauG1", 2 ** power, [0], logger);
    sr = await sameRatio$1(curve, rBetaTauG1.R1, rBetaTauG1.R2, curve.G2.g, curContr.tauG2);
    if (sr !== true) {
        if (logger) logger.error("betaTauG1 section. Powers do not match");
        return false;
    }
    if (!curve.G1.eq(curContr.betaG1, rBetaTauG1.singularPoints[0])) {
        if (logger) logger.error("First element of beta*tau*G1 section (beta*G1) does not match the one in the contribution section");
        return false;
    }

    //Verify Beta G2
    const betaG2 = await processSectionBetaG2(logger);
    if (!curve.G2.eq(curContr.betaG2, betaG2)) {
        if (logger) logger.error("betaG2 element in betaG2 section does not match the one in the contribution section");
        return false;
    }


    const nextContributionHash = nextContributionHasher.digest();

    // Check the nextChallengeHash
    if (power == ceremonyPower) {
        if (!hashIsEqual(nextContributionHash,curContr.nextChallenge)) {
            if (logger) logger.error("Hash of the values does not match the next challenge of the last contributor in the contributions section");
            return false;
        }
    }

    if (logger) logger.info(formatHash(nextContributionHash, "Next challenge hash: "));

    // Verify Previous contributions

    printContribution(curContr, prevContr);
    for (let i = contrs.length-2; i>=0; i--) {
        const curContr = contrs[i];
        const prevContr =  (i>0) ? contrs[i-1] : initialContribution;
        const res = await verifyContribution(curve, curContr, prevContr, logger);
        if (!res) return false;
        printContribution(curContr, prevContr);
    }
    if (logger) logger.info("-----------------------------------------------------");

    if ((!sections[12]) || (!sections[13]) || (!sections[14]) || (!sections[15])) {
        if (logger) logger.warn(
            "this file does not contain phase2 precalculated values. Please run: \n" +
            "   snarkjs \"powersoftau preparephase2\" to prepare this file to be used in the phase2 ceremony."
        );
    } else {
        let res;
        res = await verifyLagrangeEvaluations("G1", 2, 12, "tauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G2", 3, 13, "tauG2", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 4, 14, "alphaTauG1", logger);
        if (!res) return false;
        res = await verifyLagrangeEvaluations("G1", 5, 15, "betaTauG1", logger);
        if (!res) return false;
    }

    await fd.close();

    if (logger) logger.info("Powers of Tau Ok!");

    return true;

    function printContribution(curContr, prevContr) {
        if (!logger) return;
        logger.info("-----------------------------------------------------");
        logger.info(`Contribution #${curContr.id}: ${curContr.name ||""}`);

        logger.info(formatHash(curContr.nextChallenge, "Next Challenge: "));

        const buffV  = new Uint8Array(curve.G1.F.n8*2*6+curve.G2.F.n8*2*3);
        toPtauPubKeyRpr(buffV, 0, curve, curContr.key, false);

        const responseHasher = Blake2b(64);
        responseHasher.setPartialHash(curContr.partialHash);
        responseHasher.update(buffV);
        const responseHash = responseHasher.digest();

        logger.info(formatHash(responseHash, "Response Hash:"));

        logger.info(formatHash(prevContr.nextChallenge, "Response Hash:"));

        if (curContr.type == 1) {
            logger.info(`Beacon generator: ${byteArray2hex(curContr.beaconHash)}`);
            logger.info(`Beacon iterations Exp: ${curContr.numIterationsExp}`);
        }

    }

    async function processSectionBetaG2(logger) {
        const G = curve.G2;
        const sG = G.F.n8*2;
        const buffUv = new Uint8Array(sG);

        if (!sections[6])  {
            logger.error("File has no BetaG2 section");
            throw new Error("File has no BetaG2 section");
        }
        if (sections[6].length>1) {
            logger.error("File has no BetaG2 section");
            throw new Error("File has more than one GetaG2 section");
        }
        fd.pos = sections[6][0].p;

        const buff = await fd.read(sG);
        const P = G.fromRprLEM(buff);

        G.toRprUncompressed(buffUv, 0, P);
        nextContributionHasher.update(buffUv);

        return P;
    }

    async function processSection(idSection, groupName, sectionName, nPoints, singularPointIndexes, logger) {
        const MAX_CHUNK_SIZE = 1<<16;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await startReadUniqueSection(fd, sections, idSection);

        const singularPoints = [];

        let R1 = G.zero;
        let R2 = G.zero;

        let lastBase = G.zero;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`points relations: ${sectionName}: ${i}/${nPoints} `);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases = await fd.read(n*sG);

            const basesU = await G.batchLEMtoU(bases);
            nextContributionHasher.update(basesU);

            const scalars = new Uint8Array(4*(n-1));
            crypto.randomFillSync(scalars);


            if (i>0) {
                const firstBase = G.fromRprLEM(bases, 0);
                const r = crypto.randomBytes(4).readUInt32BE(0, true);

                R1 = G.add(R1, G.timesScalar(lastBase, r));
                R2 = G.add(R2, G.timesScalar(firstBase, r));
            }

            const r1 = await G.multiExpAffine(bases.slice(0, (n-1)*sG), scalars);
            const r2 = await G.multiExpAffine(bases.slice(sG), scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);

            lastBase = G.fromRprLEM( bases, (n-1)*sG);

            for (let j=0; j<singularPointIndexes.length; j++) {
                const sp = singularPointIndexes[j];
                if ((sp >=i) && (sp < i+n)) {
                    const P = G.fromRprLEM(bases, (sp-i)*sG);
                    singularPoints.push(P);
                }
            }

        }
        await endReadSection(fd);

        return {
            R1: R1,
            R2: R2,
            singularPoints: singularPoints
        };

    }

    async function verifyLagrangeEvaluations(gName, tauSection, lagrangeSection, sectionName, logger) {

        if (logger) logger.debug(`Verifying phase2 calculated values ${sectionName}...`);
        const G = curve[gName];
        const sG = G.F.n8*2;

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }

        for (let p=0; p<= power; p ++) {
            const res = await verifyPower(p);
            if (!res) return false;
        }

        if (tauSection == 2) {
            const res = await verifyPower(power+1);
            if (!res) return false;
        }

        return true;

        async function verifyPower(p) {
            if (logger) logger.debug(`Power ${p}...`);
            const n8r = curve.Fr.n8;
            const nPoints = 2 ** p;
            let buff_r = new Uint32Array(nPoints);
            let buffG;

            let rng = new ffjavascript.ChaCha(seed);

            if (logger) logger.debug(`Creating random numbers Powers${p}...`);
            for (let i=0; i<nPoints; i++) {
                if ((p == power+1)&&(i == nPoints-1)) {
                    buff_r[i] = 0;
                } else {
                    buff_r[i] = rng.nextU32();
                }
            }

            buff_r = new Uint8Array(buff_r.buffer, buff_r.byteOffset, buff_r.byteLength);

            if (logger) logger.debug(`reading points Powers${p}...`);
            await startReadUniqueSection(fd, sections, tauSection);
            buffG = new ffjavascript.BigBuffer(nPoints*sG);
            if (p == power+1) {
                await fd.readToBuffer(buffG, 0, (nPoints-1)*sG);
                buffG.set(curve.G1.zeroAffine, (nPoints-1)*sG);
            } else {
                await fd.readToBuffer(buffG, 0, nPoints*sG);
            }
            await endReadSection(fd, true);

            const resTau = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p);

            buff_r = new ffjavascript.BigBuffer(nPoints * n8r);

            rng = new ffjavascript.ChaCha(seed);

            const buff4 = new Uint8Array(4);
            const buff4V = new DataView(buff4.buffer);

            if (logger) logger.debug(`Creating random numbers Powers${p}...`);
            for (let i=0; i<nPoints; i++) {
                if ((i != nPoints-1) || (p != power+1)) {
                    buff4V.setUint32(0, rng.nextU32(), true);
                    buff_r.set(buff4, i*n8r);
                }
            }

            if (logger) logger.debug(`batchToMontgomery ${p}...`);
            buff_r = await curve.Fr.batchToMontgomery(buff_r);
            if (logger) logger.debug(`fft ${p}...`);
            buff_r = await curve.Fr.fft(buff_r);
            if (logger) logger.debug(`batchFromMontgomery ${p}...`);
            buff_r = await curve.Fr.batchFromMontgomery(buff_r);

            if (logger) logger.debug(`reading points Lagrange${p}...`);
            await startReadUniqueSection(fd, sections, lagrangeSection);
            fd.pos += sG*((2 ** p)-1);
            await fd.readToBuffer(buffG, 0, nPoints*sG);
            await endReadSection(fd, true);

            const resLagrange = await G.multiExpAffine(buffG, buff_r, logger, sectionName + "_" + p + "_transformed");

            if (!G.eq(resTau, resLagrange)) {
                if (logger) logger.error("Phase2 caclutation does not match with powers of tau");
                return false;
            }

            return true;
        }
    }
}

/*
    This function creates a new section in the fdTo file with id idSection.
    It multiplies the pooints in fdFrom by first, first*inc, first*inc^2, ....
    nPoint Times.
    It also updates the newChallengeHasher with the new points
*/

async function applyKeyToSection(fdOld, sections, fdNew, idSection, curve, groupName, first, inc, sectionName, logger) {
    const MAX_CHUNK_SIZE = 1 << 16;
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const nPoints = sections[idSection][0].size / sG;

    await startReadUniqueSection(fdOld, sections,idSection );
    await startWriteSection(fdNew, idSection);

    let t = first;
    for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
        if (logger) logger.debug(`Applying key: ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints - i, MAX_CHUNK_SIZE);
        let buff;
        buff = await fdOld.read(n*sG);
        buff = await G.batchApplyKey(buff, t, inc);
        await fdNew.write(buff);
        t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
    }

    await endWriteSection(fdNew);
    await endReadSection(fdOld);
}



async function applyKeyToChallengeSection(fdOld, fdNew, responseHasher, curve, groupName, nPoints, first, inc, formatOut, sectionName, logger) {
    const G = curve[groupName];
    const sG = G.F.n8*2;
    const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
    let t = first;
    for (let i=0 ; i<nPoints ; i+= chunkSize) {
        if (logger) logger.debug(`Applying key ${sectionName}: ${i}/${nPoints}`);
        const n= Math.min(nPoints-i, chunkSize );
        const buffInU = await fdOld.read(n * sG);
        const buffInLEM = await G.batchUtoLEM(buffInU);
        const buffOutLEM = await G.batchApplyKey(buffInLEM, t, inc);
        let buffOut;
        if (formatOut == "COMPRESSED") {
            buffOut = await G.batchLEMtoC(buffOutLEM);
        } else {
            buffOut = await G.batchLEMtoU(buffOutLEM);
        }

        if (responseHasher) responseHasher.update(buffOut);
        await fdNew.write(buffOut);
        t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
    }
}

// Format of the output

async function challengeContribute(curve, challengeFilename, responesFileName, entropy, logger) {
    await Blake2b.ready();

    const fdFrom = await readExisting$2(challengeFilename);


    const sG1 = curve.F1.n64*8*2;
    const sG2 = curve.F2.n64*8*2;
    const domainSize = (fdFrom.totalSize + sG1 - 64 - sG2) / (4*sG1 + sG2);
    let e = domainSize;
    let power = 0;
    while (e>1) {
        e = e /2;
        power += 1;
    }

    if (2 ** power != domainSize) throw new Error("Invalid file size");
    if (logger) logger.debug("Power to tau size: "+power);

    const rng = await getRandomRng(entropy);

    const fdTo = await createOverride(responesFileName);

    // Calculate the hash
    const challengeHasher = Blake2b(64);
    for (let i=0; i<fdFrom.totalSize; i+= fdFrom.pageSize) {
        if (logger) logger.debug(`Hashing challenge ${i}/${fdFrom.totalSize}`);
        const s = Math.min(fdFrom.totalSize - i, fdFrom.pageSize);
        const buff = await fdFrom.read(s);
        challengeHasher.update(buff);
    }

    const claimedHash = await fdFrom.read(64, 0);
    if (logger) logger.info(formatHash(claimedHash, "Claimed Previous Response Hash: "));

    const challengeHash = challengeHasher.digest();
    if (logger) logger.info(formatHash(challengeHash, "Current Challenge Hash: "));

    const key = createPTauKey(curve, challengeHash, rng);

    if (logger) {
        ["tau", "alpha", "beta"].forEach( (k) => {
            logger.debug(k + ".g1_s: " + curve.G1.toString(key[k].g1_s, 16));
            logger.debug(k + ".g1_sx: " + curve.G1.toString(key[k].g1_sx, 16));
            logger.debug(k + ".g2_sp: " + curve.G2.toString(key[k].g2_sp, 16));
            logger.debug(k + ".g2_spx: " + curve.G2.toString(key[k].g2_spx, 16));
            logger.debug("");
        });
    }

    const responseHasher = Blake2b(64);

    await fdTo.write(challengeHash);
    responseHasher.update(challengeHash);

    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)*2-1, curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG1"     , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", (2 ** power)    , curve.Fr.one    , key.tau.prvKey, "COMPRESSED", "tauG2"     , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)    , key.alpha.prvKey, key.tau.prvKey, "COMPRESSED", "alphaTauG1", logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G1", (2 ** power)    , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG1" , logger );
    await applyKeyToChallengeSection(fdFrom, fdTo, responseHasher, curve, "G2", 1             , key.beta.prvKey , key.tau.prvKey, "COMPRESSED", "betaTauG2" , logger );

    // Write and hash key
    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);
    toPtauPubKeyRpr(buffKey, 0, curve, key, false);
    await fdTo.write(buffKey);
    responseHasher.update(buffKey);
    const responseHash = responseHasher.digest();
    if (logger) logger.info(formatHash(responseHash, "Contribution Response Hash: "));

    await fdTo.close();
    await fdFrom.close();
}

async function beacon(oldPtauFilename, newPTauFilename, name,  beaconHashStr,numIterationsExp, logger) {
    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    await Blake2b.ready();

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);
    if (power != ceremonyPower) {
        if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
        return false;
    }
    if (sections[12]) {
        if (logger) logger.warn("Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
    }
    const contributions = await readContributions(fdOld, curve, sections);
    const curContribution = {
        name: name,
        type: 1, // Beacon
        numIterationsExp: numIterationsExp,
        beaconHash: beaconHash
    };

    let lastChallengeHash;

    if (contributions.length>0) {
        lastChallengeHash = contributions[contributions.length-1].nextChallenge;
    } else {
        lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
    }

    curContribution.key = keyFromBeacon(curve, lastChallengeHash, beaconHash, numIterationsExp);

    const responseHasher = new Blake2b(64);
    responseHasher.update(lastChallengeHash);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const startSections = [];

    let firstPoints;
    firstPoints = await processSection(2, "G1",  (2 ** power) * 2 -1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1", logger );
    curContribution.tauG1 = firstPoints[1];
    firstPoints = await processSection(3, "G2",  (2 ** power) , curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2", logger );
    curContribution.tauG2 = firstPoints[1];
    firstPoints = await processSection(4, "G1",  (2 ** power) , curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1", logger );
    curContribution.alphaG1 = firstPoints[0];
    firstPoints = await processSection(5, "G1",  (2 ** power) , curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1", logger );
    curContribution.betaG1 = firstPoints[0];
    firstPoints = await processSection(6, "G2",  1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2", logger );
    curContribution.betaG2 = firstPoints[0];

    curContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallengeHasher = new Blake2b(64);
    nextChallengeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (2 ** power) * 2 -1, "tauG1", logger);
    await hashSection(fdNew, "G2", 3, (2 ** power)       , "tauG2", logger);
    await hashSection(fdNew, "G1", 4, (2 ** power)       , "alphaTauG1", logger);
    await hashSection(fdNew, "G1", 5, (2 ** power)       , "betaTauG1", logger);
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2", logger);

    curContribution.nextChallenge = nextChallengeHasher.digest();

    if (logger) logger.info(formatHash(curContribution.nextChallenge, "Next Challenge Hash: "));

    contributions.push(curContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();

    return hashResponse;

    async function processSection(sectionId, groupName, NPoints, first, inc, sectionName, logger) {
        const res = [];
        fdOld.pos = sections[sectionId][0].p;

        await startWriteSection(fdNew, sectionId);

        startSections[sectionId] = fdNew.pos;

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<NPoints ; i+= chunkSize) {
            if (logger) logger.debug(`applying key${sectionName}: ${i}/${NPoints}`);
            const n= Math.min(NPoints-i, chunkSize );
            const buffIn = await fdOld.read(n * sG);
            const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);

            /* Code to test the case where we don't have the 2^m-2 component
            if (sectionName== "tauG1") {
                const bz = new Uint8Array(64);
                buffOutLEM.set(bz, 64*((2 ** power) - 1 ));
            }
            */

            const promiseWrite = fdNew.write(buffOutLEM);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await promiseWrite;
            if (i==0)   // Return the 2 first points.
                for (let j=0; j<Math.min(2, NPoints); j++)
                    res.push(G.fromRprLEM(buffOutLEM, j*sG));
            t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
        }

        await endWriteSection(fdNew);

        return res;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName, logger) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if (logger) logger.debug(`Hashing ${sectionName}: ${i}/${nPoints}`);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallengeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }
}

// Format of the output

async function contribute(oldPtauFilename, newPTauFilename, name, entropy, logger) {
    await Blake2b.ready();

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);
    if (power != ceremonyPower) {
        if (logger) logger.error("This file has been reduced. You cannot contribute into a reduced file.");
        throw new Error("This file has been reduced. You cannot contribute into a reduced file.");
    }
    if (sections[12]) {
        if (logger) logger.warn("WARNING: Contributing into a file that has phase2 calculated. You will have to prepare phase2 again.");
    }
    const contributions = await readContributions(fdOld, curve, sections);
    const curContribution = {
        name: name,
        type: 0, // Beacon
    };

    let lastChallengeHash;

    const rng = await getRandomRng(entropy);

    if (contributions.length>0) {
        lastChallengeHash = contributions[contributions.length-1].nextChallenge;
    } else {
        lastChallengeHash = calculateFirstChallengeHash(curve, power, logger);
    }

    // Generate a random key


    curContribution.key = createPTauKey(curve, lastChallengeHash, rng);


    const responseHasher = new Blake2b(64);
    responseHasher.update(lastChallengeHash);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 7);
    await writePTauHeader(fdNew, curve, power);

    const startSections = [];

    let firstPoints;
    firstPoints = await processSection(2, "G1",  (2 ** power) * 2 -1, curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG1" );
    curContribution.tauG1 = firstPoints[1];
    firstPoints = await processSection(3, "G2",  (2 ** power) , curve.Fr.e(1), curContribution.key.tau.prvKey, "tauG2" );
    curContribution.tauG2 = firstPoints[1];
    firstPoints = await processSection(4, "G1",  (2 ** power) , curContribution.key.alpha.prvKey, curContribution.key.tau.prvKey, "alphaTauG1" );
    curContribution.alphaG1 = firstPoints[0];
    firstPoints = await processSection(5, "G1",  (2 ** power) , curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG1" );
    curContribution.betaG1 = firstPoints[0];
    firstPoints = await processSection(6, "G2",  1, curContribution.key.beta.prvKey, curContribution.key.tau.prvKey, "betaTauG2" );
    curContribution.betaG2 = firstPoints[0];

    curContribution.partialHash = responseHasher.getPartialHash();

    const buffKey = new Uint8Array(curve.F1.n8*2*6+curve.F2.n8*2*3);

    toPtauPubKeyRpr(buffKey, 0, curve, curContribution.key, false);

    responseHasher.update(new Uint8Array(buffKey));
    const hashResponse = responseHasher.digest();

    if (logger) logger.info(formatHash(hashResponse, "Contribution Response Hash imported: "));

    const nextChallengeHasher = new Blake2b(64);
    nextChallengeHasher.update(hashResponse);

    await hashSection(fdNew, "G1", 2, (2 ** power) * 2 -1, "tauG1");
    await hashSection(fdNew, "G2", 3, (2 ** power)       , "tauG2");
    await hashSection(fdNew, "G1", 4, (2 ** power)       , "alphaTauG1");
    await hashSection(fdNew, "G1", 5, (2 ** power)       , "betaTauG1");
    await hashSection(fdNew, "G2", 6, 1                  , "betaG2");

    curContribution.nextChallenge = nextChallengeHasher.digest();

    if (logger) logger.info(formatHash(curContribution.nextChallenge, "Next Challenge Hash: "));

    contributions.push(curContribution);

    await writeContributions(fdNew, curve, contributions);

    await fdOld.close();
    await fdNew.close();

    return hashResponse;

    async function processSection(sectionId, groupName, NPoints, first, inc, sectionName) {
        const res = [];
        fdOld.pos = sections[sectionId][0].p;

        await startWriteSection(fdNew, sectionId);

        startSections[sectionId] = fdNew.pos;

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const chunkSize = Math.floor((1<<20) / sG);   // 128Mb chunks
        let t = first;
        for (let i=0 ; i<NPoints ; i+= chunkSize) {
            if (logger) logger.debug(`processing: ${sectionName}: ${i}/${NPoints}`);
            const n= Math.min(NPoints-i, chunkSize );
            const buffIn = await fdOld.read(n * sG);
            const buffOutLEM = await G.batchApplyKey(buffIn, t, inc);

            /* Code to test the case where we don't have the 2^m-2 component
            if (sectionName== "tauG1") {
                const bz = new Uint8Array(64);
                buffOutLEM.set(bz, 64*((2 ** power) - 1 ));
            }
            */

            const promiseWrite = fdNew.write(buffOutLEM);
            const buffOutC = await G.batchLEMtoC(buffOutLEM);

            responseHasher.update(buffOutC);
            await promiseWrite;
            if (i==0)   // Return the 2 first points.
                for (let j=0; j<Math.min(2, NPoints); j++)
                    res.push(G.fromRprLEM(buffOutLEM, j*sG));
            t = curve.Fr.mul(t, curve.Fr.exp(inc, n));
        }

        await endWriteSection(fdNew);

        return res;
    }


    async function hashSection(fdTo, groupName, sectionId, nPoints, sectionName) {

        const G = curve[groupName];
        const sG = G.F.n8*2;
        const nPointsChunk = Math.floor((1<<24)/sG);

        const oldPos = fdTo.pos;
        fdTo.pos = startSections[sectionId];

        for (let i=0; i< nPoints; i += nPointsChunk) {
            if ((logger)&&i) logger.debug(`Hashing ${sectionName}: ` + i);
            const n = Math.min(nPoints-i, nPointsChunk);

            const buffLEM = await fdTo.read(n * sG);

            const buffU = await G.batchLEMtoU(buffLEM);

            nextChallengeHasher.update(buffU);
        }

        fdTo.pos = oldPos;
    }


}

async function preparePhase2(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 11);
    await writePTauHeader(fdNew, curve, power);

    await copySection(fdOld, sections, fdNew, 2);
    await copySection(fdOld, sections, fdNew, 3);
    await copySection(fdOld, sections, fdNew, 4);
    await copySection(fdOld, sections, fdNew, 5);
    await copySection(fdOld, sections, fdNew, 6);
    await copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1", "tauG1" );
    await processSection(3, 13, "G2", "tauG2" );
    await processSection(4, 14, "G1", "alphaTauG1" );
    await processSection(5, 15, "G1", "betaTauG1" );

    await fdOld.close();
    await fdNew.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        if (logger) logger.debug("Starting section: "+sectionName);

        await startWriteSection(fdNew, newSectionId);

        for (let p=0; p<=power; p++) {
            await processSectionPower(p);
        }

        if (oldSectionId == 2) {
            await processSectionPower(power+1);
        }

        await endWriteSection(fdNew);


        async function processSectionPower(p) {
            const nPoints = 2 ** p;
            const G = curve[Gstr];
            const Fr = curve.Fr;
            const sGin = G.F.n8*2;
            const sGmid = G.F.n8*3;

            let buff;
            buff = new ffjavascript.BigBuffer(nPoints*sGin);

            await startReadUniqueSection(fdOld, sections, oldSectionId);
            if ((oldSectionId == 2)&&(p==power+1)) {
                await fdOld.readToBuffer(buff, 0,(nPoints-1)*sGin );
                buff.set(curve.G1.zeroAffine, (nPoints-1)*sGin );
            } else {
                await fdOld.readToBuffer(buff, 0,nPoints*sGin );
            }
            await endReadSection(fdOld, true);


            buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
            await fdNew.write(buff);

/*
            if (p <= curve.Fr.s) {
                buff = await G.ifft(buff, "affine", "affine", logger, sectionName);
                await fdNew.write(buff);
            } else if (p == curve.Fr.s+1) {
                const smallM = 1<<curve.Fr.s;
                let t0 = new BigBuffer( smallM * sGmid );
                let t1 = new BigBuffer( smallM * sGmid );

                const shift_to_small_m = Fr.exp(Fr.shift, smallM);
                const one_over_denom = Fr.inv(Fr.sub(shift_to_small_m, Fr.one));

                let sInvAcc = Fr.one;
                for (let i=0; i<smallM; i++) {
                    const ti =  buff.slice(i*sGin, (i+1)*sGin);
                    const tmi = buff.slice((i+smallM)*sGin, (i+smallM+1)*sGin);

                    t0.set(
                        G.timesFr(
                            G.sub(
                                G.timesFr(ti , shift_to_small_m),
                                tmi
                            ),
                            one_over_denom
                        ),
                        i*sGmid
                    );
                    t1.set(
                        G.timesFr(
                            G.sub( tmi, ti),
                            Fr.mul(sInvAcc, one_over_denom)
                        ),
                        i*sGmid
                    );


                    sInvAcc = Fr.mul(sInvAcc, Fr.shiftInv);
                }
                t0 = await G.ifft(t0, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t0);
                t0 = null;
                t1 = await G.ifft(t1, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t1);

            } else {
                if (logger) logger.error("Power too big");
                throw new Error("Power to big");
            }
*/
        }
    }
}

async function truncate(ptauFilename, template, logger) {

    const {fd: fdOld, sections} = await readBinFile(ptauFilename, "ptau", 1);
    const {curve, power, ceremonyPower} = await readPTauHeader(fdOld, sections);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    for (let p=1; p<power; p++) {
        await generateTruncate(p);
    }

    await fdOld.close();

    return true;

    async function generateTruncate(p) {

        let sP = p.toString();
        while (sP.length<2) sP = "0" + sP;

        if (logger) logger.debug("Writing Power: "+sP);

        const fdNew = await createBinFile(template + sP + ".ptau", "ptau", 1, 11);
        await writePTauHeader(fdNew, curve, p, ceremonyPower);

        await copySection(fdOld, sections, fdNew, 2, ((2 ** p)*2-1) * sG1 ); // tagG1
        await copySection(fdOld, sections, fdNew, 3, (2 ** p) * sG2); // tauG2
        await copySection(fdOld, sections, fdNew, 4, (2 ** p) * sG1); // alfaTauG1
        await copySection(fdOld, sections, fdNew, 5, (2 ** p) * sG1); // betaTauG1
        await copySection(fdOld, sections, fdNew, 6,  sG2); // betaTauG2
        await copySection(fdOld, sections, fdNew, 7); // contributions
        await copySection(fdOld, sections, fdNew, 12, ((2 ** (p+1))*2 -1) * sG1); // L_tauG1
        await copySection(fdOld, sections, fdNew, 13, ((2 ** p)*2 -1) * sG2); // L_tauG2
        await copySection(fdOld, sections, fdNew, 14, ((2 ** p)*2 -1) * sG1); // L_alfaTauG1
        await copySection(fdOld, sections, fdNew, 15, ((2 ** p)*2 -1) * sG1); // L_betaTauG1

        await fdNew.close();
    }


}

async function convert(oldPtauFilename, newPTauFilename, logger) {

    const {fd: fdOld, sections} = await readBinFile(oldPtauFilename, "ptau", 1);
    const {curve, power} = await readPTauHeader(fdOld, sections);

    const fdNew = await createBinFile(newPTauFilename, "ptau", 1, 11);
    await writePTauHeader(fdNew, curve, power);

    // const fdTmp = await fastFile.createOverride(newPTauFilename+ ".tmp");

    await copySection(fdOld, sections, fdNew, 2);
    await copySection(fdOld, sections, fdNew, 3);
    await copySection(fdOld, sections, fdNew, 4);
    await copySection(fdOld, sections, fdNew, 5);
    await copySection(fdOld, sections, fdNew, 6);
    await copySection(fdOld, sections, fdNew, 7);

    await processSection(2, 12, "G1", "tauG1" );
    await copySection(fdOld, sections, fdNew, 13);
    await copySection(fdOld, sections, fdNew, 14);
    await copySection(fdOld, sections, fdNew, 15);

    await fdOld.close();
    await fdNew.close();

    // await fs.promises.unlink(newPTauFilename+ ".tmp");

    return;

    async function processSection(oldSectionId, newSectionId, Gstr, sectionName) {
        if (logger) logger.debug("Starting section: "+sectionName);

        await startWriteSection(fdNew, newSectionId);

        const size = sections[newSectionId][0].size;
        const chunkSize = fdOld.pageSize;
        await startReadUniqueSection(fdOld, sections, newSectionId);
        for (let p=0; p<size; p+=chunkSize) {
            const l = Math.min(size -p, chunkSize);
            const buff = await fdOld.read(l);
            await fdNew.write(buff);
        }
        await endReadSection(fdOld);

        if (oldSectionId == 2) {
            await processSectionPower(power+1);
        }

        await endWriteSection(fdNew);

        async function processSectionPower(p) {
            const nPoints = 2 ** p;
            const G = curve[Gstr];
            const sGin = G.F.n8*2;

            let buff;
            buff = new ffjavascript.BigBuffer(nPoints*sGin);

            await startReadUniqueSection(fdOld, sections, oldSectionId);
            if ((oldSectionId == 2)&&(p==power+1)) {
                await fdOld.readToBuffer(buff, 0,(nPoints-1)*sGin );
                buff.set(curve.G1.zeroAffine, (nPoints-1)*sGin );
            } else {
                await fdOld.readToBuffer(buff, 0,nPoints*sGin );
            }
            await endReadSection(fdOld, true);

            buff = await G.lagrangeEvaluations(buff, "affine", "affine", logger, sectionName);
            await fdNew.write(buff);

/*
            if (p <= curve.Fr.s) {
                buff = await G.ifft(buff, "affine", "affine", logger, sectionName);
                await fdNew.write(buff);
            } else if (p == curve.Fr.s+1) {
                const smallM = 1<<curve.Fr.s;
                let t0 = new BigBuffer( smallM * sGmid );
                let t1 = new BigBuffer( smallM * sGmid );

                const shift_to_small_m = Fr.exp(Fr.shift, smallM);
                const one_over_denom = Fr.inv(Fr.sub(shift_to_small_m, Fr.one));

                let sInvAcc = Fr.one;
                for (let i=0; i<smallM; i++) {
                    if (i%10000) logger.debug(`sectionName prepare L calc: ${sectionName}, ${i}/${smallM}`);
                    const ti =  buff.slice(i*sGin, (i+1)*sGin);
                    const tmi = buff.slice((i+smallM)*sGin, (i+smallM+1)*sGin);

                    t0.set(
                        G.timesFr(
                            G.sub(
                                G.timesFr(ti , shift_to_small_m),
                                tmi
                            ),
                            one_over_denom
                        ),
                        i*sGmid
                    );
                    t1.set(
                        G.timesFr(
                            G.sub( tmi, ti),
                            Fr.mul(sInvAcc, one_over_denom)
                        ),
                        i*sGmid
                    );


                    sInvAcc = Fr.mul(sInvAcc, Fr.shiftInv);
                }
                t0 = await G.ifft(t0, "jacobian", "affine", logger, sectionName + " t0");
                await fdNew.write(t0);
                t0 = null;
                t1 = await G.ifft(t1, "jacobian", "affine", logger, sectionName + " t1");
                await fdNew.write(t1);

            } else {
                if (logger) logger.error("Power too big");
                throw new Error("Power to big");
            }
*/
        }


    }
}

async function exportJson(pTauFilename, verbose) {
    const {fd, sections} = await readBinFile(pTauFilename, "ptau", 1);

    const {curve, power} = await readPTauHeader(fd, sections);

    const pTau = {};
    pTau.q = curve.q;
    pTau.power = power;
    pTau.contributions = await readContributions(fd, curve, sections);

    pTau.tauG1 = await exportSection(2, "G1", (2 ** power)*2 -1, "tauG1");
    pTau.tauG2 = await exportSection(3, "G2", (2 ** power), "tauG2");
    pTau.alphaTauG1 = await exportSection(4, "G1", (2 ** power), "alphaTauG1");
    pTau.betaTauG1 = await exportSection(5, "G1", (2 ** power), "betaTauG1");
    pTau.betaG2 = await exportSection(6, "G2", 1, "betaG2");

    pTau.lTauG1 = await exportLagrange(12, "G1", "lTauG1");
    pTau.lTauG2 = await exportLagrange(13, "G2", "lTauG2");
    pTau.lAlphaTauG1 = await exportLagrange(14, "G1", "lAlphaTauG2");
    pTau.lBetaTauG1 = await exportLagrange(15, "G1", "lBetaTauG2");

    await fd.close();

    return pTau;



    async function exportSection(sectionId, groupName, nPoints, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;

        const res = [];
        await startReadUniqueSection(fd, sections, sectionId);
        for (let i=0; i< nPoints; i++) {
            if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ` + i);
            const buff = await fd.read(sG);
            res.push(G.fromRprLEM(buff, 0));
        }
        await endReadSection(fd);

        return res;
    }

    async function exportLagrange(sectionId, groupName, sectionName) {
        const G = curve[groupName];
        const sG = G.F.n8*2;

        const res = [];
        await startReadUniqueSection(fd, sections, sectionId);
        for (let p=0; p<=power; p++) {
            if (verbose) console.log(`${sectionName}: Power: ${p}`);
            res[p] = [];
            const nPoints = (2 ** p);
            for (let i=0; i<nPoints; i++) {
                if ((verbose)&&i&&(i%10000 == 0)) console.log(`${sectionName}: ${i}/${nPoints}`);
                const buff = await fd.read(sG);
                res[p].push(G.fromRprLEM(buff, 0));
            }
        }
        await endReadSection(fd);
        return res;
    }


}

var powersoftau = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newAccumulator: newAccumulator,
    exportChallenge: exportChallenge,
    importResponse: importResponse,
    verify: verify,
    challengeContribute: challengeContribute,
    beacon: beacon,
    contribute: contribute,
    preparePhase2: preparePhase2,
    truncate: truncate,
    convert: convert,
    exportJson: exportJson
});

function r1csPrint(r1cs, syms, logger) {
    for (let i=0; i<r1cs.constraints.length; i++) {
        printCostraint(r1cs.constraints[i]);
    }
    function printCostraint(c) {
        const lc2str = (lc) => {
            let S = "";
            const keys = Object.keys(lc);
            keys.forEach( (k) => {
                let name = syms.varIdx2Name[k];
                if (name == "one") name = "";

                let vs = r1cs.curve.Fr.toString(lc[k]);
                if (vs == "1") vs = "";  // Do not show ones
                if (vs == "-1") vs = "-";  // Do not show ones
                if ((S!="")&&(vs[0]!="-")) vs = "+"+vs;
                if (S!="") vs = " "+vs;
                S= S + vs   + name;
            });
            return S;
        };
        const S = `[ ${lc2str(c[0])} ] * [ ${lc2str(c[1])} ] - [ ${lc2str(c[2])} ] = 0`;
        if (logger) logger.info(S);
    }

}

const SUBARRAY_SIZE = 0x40000;

const BigArrayHandler = {
    get: function(obj, prop) {
        if (!isNaN(prop)) {
            return obj.getElement(prop);
        } else return obj[prop];
    },
    set: function(obj, prop, value) {
        if (!isNaN(prop)) {
            return obj.setElement(prop, value);
        } else {
            obj[prop] = value;
            return true;
        }
    }
};

class _BigArray {
    constructor (initSize) {
        this.length = initSize || 0;
        this.arr = new Array(SUBARRAY_SIZE);

        for (let i=0; i<initSize; i+=SUBARRAY_SIZE) {
            this.arr[i/SUBARRAY_SIZE] = new Array(Math.min(SUBARRAY_SIZE, initSize - i));
        }
        return this;
    }
    push () {
        for (let i=0; i<arguments.length; i++) {
            this.setElement (this.length, arguments[i]);
        }
    }

    slice (f, t) {
        const arr = new Array(t-f);
        for (let i=f; i< t; i++) arr[i-f] = this.getElement(i);
        return arr;
    }
    getElement(idx) {
        idx = parseInt(idx);
        const idx1 = Math.floor(idx / SUBARRAY_SIZE);
        const idx2 = idx % SUBARRAY_SIZE;
        return this.arr[idx1] ? this.arr[idx1][idx2] : undefined;
    }
    setElement(idx, value) {
        idx = parseInt(idx);
        const idx1 = Math.floor(idx / SUBARRAY_SIZE);
        if (!this.arr[idx1]) {
            this.arr[idx1] = new Array(SUBARRAY_SIZE);
        }
        const idx2 = idx % SUBARRAY_SIZE;
        this.arr[idx1][idx2] = value;
        if (idx >= this.length) this.length = idx+1;
        return true;
    }
    getKeys() {
        const newA = new BigArray();
        for (let i=0; i<this.arr.length; i++) {
            if (this.arr[i]) {
                for (let j=0; j<this.arr[i].length; j++) {
                    if (typeof this.arr[i][j] !== "undefined") {
                        newA.push(i*SUBARRAY_SIZE+j);
                    }
                }
            }
        }
        return newA;
    }
}

class BigArray {
    constructor( initSize ) {
        const obj = new _BigArray(initSize);
        const extObj = new Proxy(obj, BigArrayHandler);
        return extObj;
    }
}

async function readBinFile$1(fileName, type, maxVersion, cacheSize, pageSize) {

    const fd = await readExisting$2(fileName, cacheSize, pageSize);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

    if (readedType != type) throw new Error(fileName + ": Invalid File format");

    let v = await fd.readULE32();

    if (v>maxVersion) throw new Error("Version not supported");

    const nSections = await fd.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fd.readULE32();
        let hl = await fd.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fd.pos,
            size: hl
        });
        fd.pos += hl;
    }

    return {fd, sections};
}

async function startReadUniqueSection$1(fd, sections, idSection) {
    if (typeof fd.readingSection !== "undefined") throw new Error("Already reading a section");
    if (!sections[idSection])  throw new Error(fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) throw new Error(fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

async function endReadSection$1(fd, noCheck) {
    if (typeof fd.readingSection === "undefined") throw new Error("Not reading a section");
    if (!noCheck) {
        if (fd.pos-fd.readingSection.p !=  fd.readingSection.size) throw new Error("Invalid section size reading");
    }
    delete fd.readingSection;
}

async function readBigInt$1(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return ffjavascript.Scalar.fromRprLE(buff, 0, n8);
}

async function readSection$1(fd, sections, idSection, offset, length) {

    offset = (typeof offset === "undefined") ? 0 : offset;
    length = (typeof length === "undefined") ? sections[idSection][0].size - offset : length;

    if (offset + length > sections[idSection][0].size) {
        throw new Error("Reading out of the range of the section");
    }

    let buff;
    if (length < (1 << 30) ) {
        buff = new Uint8Array(length);
    } else {
        buff = new ffjavascript.BigBuffer(length);
    }

    await fd.readToBuffer(buff, 0, length, sections[idSection][0].p + offset);
    return buff;
}

async function readR1csHeader(fd,sections,singleThread) {


    const res = {};
    await startReadUniqueSection$1(fd, sections, 1);
    // Read Header
    res.n8 = await fd.readULE32();
    res.prime = await readBigInt$1(fd, res.n8);

    res.curve = await ffjavascript.getCurveFromR(res.prime, singleThread);

    res.nVars = await fd.readULE32();
    res.nOutputs = await fd.readULE32();
    res.nPubInputs = await fd.readULE32();
    res.nPrvInputs = await fd.readULE32();
    res.nLabels = await fd.readULE64();
    res.nConstraints = await fd.readULE32();
    await endReadSection$1(fd);

    return res;
}

async function readConstraints(fd,sections, r1cs, logger, loggerCtx) {
    const bR1cs = await readSection$1(fd, sections, 2);
    let bR1csPos = 0;
    let constraints;
    if (r1cs.nConstraints>1<<20) {
        constraints = new BigArray();
    } else {
        constraints = [];
    }
    for (let i=0; i<r1cs.nConstraints; i++) {
        if ((logger)&&(i%100000 == 0)) logger.info(`${loggerCtx}: Loading constraints: ${i}/${r1cs.nConstraints}`);
        const c = readConstraint();
        constraints.push(c);
    }
    return constraints;


    function readConstraint() {
        const c = [];
        c[0] = readLC();
        c[1] = readLC();
        c[2] = readLC();
        return c;
    }

    function readLC() {
        const lc= {};

        const buffUL32 = bR1cs.slice(bR1csPos, bR1csPos+4);
        bR1csPos += 4;
        const buffUL32V = new DataView(buffUL32.buffer);
        const nIdx = buffUL32V.getUint32(0, true);

        const buff = bR1cs.slice(bR1csPos, bR1csPos + (4+r1cs.n8)*nIdx );
        bR1csPos += (4+r1cs.n8)*nIdx;
        const buffV = new DataView(buff.buffer);
        for (let i=0; i<nIdx; i++) {
            const idx = buffV.getUint32(i*(4+r1cs.n8), true);
            const val = r1cs.curve.Fr.fromRprLE(buff, i*(4+r1cs.n8)+4);
            lc[idx] = val;
        }
        return lc;
    }
}

async function readMap(fd, sections, r1cs, logger, loggerCtx) {
    const bMap = await readSection$1(fd, sections, 3);
    let bMapPos = 0;
    let map;

    if (r1cs.nVars>1<<20) {
        map = new BigArray();
    } else {
        map = [];
    }
    for (let i=0; i<r1cs.nVars; i++) {
        if ((logger)&&(i%10000 == 0)) logger.info(`${loggerCtx}: Loading map: ${i}/${r1cs.nVars}`);
        const idx = readULE64();
        map.push(idx);
    }

    return map;

    function readULE64() {
        const buffULE64 = bMap.slice(bMapPos, bMapPos+8);
        bMapPos += 8;
        const buffULE64V = new DataView(buffULE64.buffer);
        const LSB = buffULE64V.getUint32(0, true);
        const MSB = buffULE64V.getUint32(4, true);

        return MSB * 0x100000000 + LSB;
    }

}

async function readR1cs(fileName, loadConstraints, loadMap, singleThread, logger, loggerCtx) {

    const {fd, sections} = await readBinFile$1(fileName, "r1cs", 1, 1<<25, 1<<22);

    const res = await readR1csHeader(fd, sections, singleThread);


    if (loadConstraints) {
        res.constraints = await readConstraints(fd, sections, res, logger, loggerCtx);
    }

    // Read Labels

    if (loadMap) {
        res.map = await readMap(fd, sections, res, logger, loggerCtx);
    }

    await fd.close();

    return res;
}

const bls12381r$1 = ffjavascript.Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r$1 = ffjavascript.Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

async function r1csInfo(r1csName, logger) {

    const cir = await readR1cs(r1csName);

    if (ffjavascript.Scalar.eq(cir.prime, bn128r$1)) {
        if (logger) logger.info("Curve: bn-128");
    } else if (ffjavascript.Scalar.eq(cir.prime, bls12381r$1)) {
        if (logger) logger.info("Curve: bls12-381");
    } else {
        if (logger) logger.info(`Unknown Curve. Prime: ${ffjavascript.Scalar.toString(cir.prime)}`);
    }
    if (logger) logger.info(`# of Wires: ${cir.nVars}`);
    if (logger) logger.info(`# of Constraints: ${cir.nConstraints}`);
    if (logger) logger.info(`# of Private Inputs: ${cir.nPrvInputs}`);
    if (logger) logger.info(`# of Public Inputs: ${cir.nPubInputs}`);
    if (logger) logger.info(`# of Labels: ${cir.nLabels}`);
    if (logger) logger.info(`# of Outputs: ${cir.nOutputs}`);

    return cir;
}

function stringifyBigInts$1(Fr, o) {
    if (o instanceof Uint8Array)  {
        return Fr.toString(o);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts$1.bind(null, Fr));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach( (k) => {
            res[k] = stringifyBigInts$1(Fr, o[k]);
        });
        return res;
    } else if ((typeof(o) == "bigint") || o.eq !== undefined)  {
        return o.toString(10);
    } else {
        return o;
    }
}


async function r1csExportJson(r1csFileName, logger) {

    const cir = await readR1cs(r1csFileName, true, true, true, logger);
    const Fr=cir.curve.Fr;
    delete cir.curve;

    return stringifyBigInts$1(Fr, cir);
}

var r1cs = /*#__PURE__*/Object.freeze({
    __proto__: null,
    print: r1csPrint,
    info: r1csInfo,
    exportJson: r1csExportJson
});

async function loadSymbols(symFileName) {
    const sym = {
        labelIdx2Name: [ "one" ],
        varIdx2Name: [ "one" ],
        componentIdx2Name: []
    };
    const fd = await readExisting$2(symFileName);
    const buff = await fd.read(fd.totalSize);
    const symsStr = new TextDecoder("utf-8").decode(buff);
    const lines = symsStr.split("\n");
    for (let i=0; i<lines.length; i++) {
        const arr = lines[i].split(",");
        if (arr.length!=4) continue;
        if (sym.varIdx2Name[arr[1]]) {
            sym.varIdx2Name[arr[1]] += "|" + arr[3];
        } else {
            sym.varIdx2Name[arr[1]] = arr[3];
        }
        sym.labelIdx2Name[arr[0]] = arr[3];
        if (!sym.componentIdx2Name[arr[2]]) {
            sym.componentIdx2Name[arr[2]] = extractComponent(arr[3]);
        }
    }

    await fd.close();

    return sym;

    function extractComponent(name) {
        const arr = name.split(".");
        arr.pop(); // Remove the lasr element
        return arr.join(".");
    }
}

const { WitnessCalculatorBuilder: WitnessCalculatorBuilder$1 } = circomRuntime;

async function wtnsDebug(input, wasmFileName, wtnsFileName, symName, options, logger) {

    const fdWasm = await readExisting$2(wasmFileName);
    const wasm = await fdWasm.read(fdWasm.totalSize);
    await fdWasm.close();


    let wcOps = {
        sanityCheck: true
    };
    let sym = await loadSymbols(symName);
    if (options.set) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logSetSignal= function(labelIdx, value) {
            if (logger) logger.info("SET " + sym.labelIdx2Name[labelIdx] + " <-- " + value.toString());
        };
    }
    if (options.get) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logGetSignal= function(varIdx, value) {
            if (logger) logger.info("GET " + sym.labelIdx2Name[varIdx] + " --> " + value.toString());
        };
    }
    if (options.trigger) {
        if (!sym) sym = await loadSymbols(symName);
        wcOps.logStartComponent= function(cIdx) {
            if (logger) logger.info("START: " + sym.componentIdx2Name[cIdx]);
        };
        wcOps.logFinishComponent= function(cIdx) {
            if (logger) logger.info("FINISH: " + sym.componentIdx2Name[cIdx]);
        };
    }
    wcOps.sym = sym;

    const wc = await WitnessCalculatorBuilder$1(wasm, wcOps);
    const w = await wc.calculateWitness(input);

    const fdWtns = await createBinFile(wtnsFileName, "wtns", 2, 2);

    await write(fdWtns, w, wc.prime);

    await fdWtns.close();
}

async function wtnsExportJson(wtnsFileName) {

    const w = await read(wtnsFileName);

    return w;
}

var wtns = /*#__PURE__*/Object.freeze({
    __proto__: null,
    calculate: wtnsCalculate,
    debug: wtnsDebug,
    exportJson: wtnsExportJson
});

const SUBARRAY_SIZE$1 = 0x40000;

const BigArrayHandler$1 = {
    get: function(obj, prop) {
        if (!isNaN(prop)) {
            return obj.getElement(prop);
        } else return obj[prop];
    },
    set: function(obj, prop, value) {
        if (!isNaN(prop)) {
            return obj.setElement(prop, value);
        } else {
            obj[prop] = value;
            return true;
        }
    }
};

class _BigArray$1 {
    constructor (initSize) {
        this.length = initSize || 0;
        this.arr = new Array(SUBARRAY_SIZE$1);

        for (let i=0; i<initSize; i+=SUBARRAY_SIZE$1) {
            this.arr[i/SUBARRAY_SIZE$1] = new Array(Math.min(SUBARRAY_SIZE$1, initSize - i));
        }
        return this;
    }
    push () {
        for (let i=0; i<arguments.length; i++) {
            this.setElement (this.length, arguments[i]);
        }
    }

    slice (f, t) {
        const arr = new Array(t-f);
        for (let i=f; i< t; i++) arr[i-f] = this.getElement(i);
        return arr;
    }
    getElement(idx) {
        idx = parseInt(idx);
        const idx1 = Math.floor(idx / SUBARRAY_SIZE$1);
        const idx2 = idx % SUBARRAY_SIZE$1;
        return this.arr[idx1] ? this.arr[idx1][idx2] : undefined;
    }
    setElement(idx, value) {
        idx = parseInt(idx);
        const idx1 = Math.floor(idx / SUBARRAY_SIZE$1);
        if (!this.arr[idx1]) {
            this.arr[idx1] = new Array(SUBARRAY_SIZE$1);
        }
        const idx2 = idx % SUBARRAY_SIZE$1;
        this.arr[idx1][idx2] = value;
        if (idx >= this.length) this.length = idx+1;
        return true;
    }
    getKeys() {
        const newA = new BigArray$1();
        for (let i=0; i<this.arr.length; i++) {
            if (this.arr[i]) {
                for (let j=0; j<this.arr[i].length; j++) {
                    if (typeof this.arr[i][j] !== "undefined") {
                        newA.push(i*SUBARRAY_SIZE$1+j);
                    }
                }
            }
        }
        return newA;
    }
}

class BigArray$1 {
    constructor( initSize ) {
        const obj = new _BigArray$1(initSize);
        const extObj = new Proxy(obj, BigArrayHandler$1);
        return extObj;
    }
}

async function newZKey(r1csName, ptauName, zkeyName, logger) {

    const TAU_G1 = 0;
    const TAU_G2 = 1;
    const ALPHATAU_G1 = 2;
    const BETATAU_G1 = 3;
    await Blake2b.ready();
    const csHasher = Blake2b(64);

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauName, "ptau", 1, 1<<22, 1<<24);
    const {curve, power} = await readPTauHeader(fdPTau, sectionsPTau);
    const {fd: fdR1cs, sections: sectionsR1cs} = await readBinFile(r1csName, "r1cs", 1, 1<<22, 1<<24);
    const r1cs = await readR1csHeader(fdR1cs, sectionsR1cs, false);

    const fdZKey = await createBinFile(zkeyName, "zkey", 1, 10, 1<<22, 1<<24);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    if (r1cs.prime != curve.r) {
        if (logger) logger.error("r1cs curve does not match powers of tau ceremony curve");
        return -1;
    }

    const cirPower = log2(r1cs.nConstraints + r1cs.nPubInputs + r1cs.nOutputs +1 -1) +1;

    if (cirPower > power) {
        if (logger) logger.error(`circuit too big for this power of tau ceremony. ${r1cs.nConstraints}*2 > 2**${power}`);
        return -1;
    }

    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const nPublic = r1cs.nOutputs + r1cs.nPubInputs;
    const domainSize = 2 ** cirPower;

    // Write the header
    ///////////
    await startWriteSection(fdZKey, 1);
    await fdZKey.writeULE32(1); // Groth
    await endWriteSection(fdZKey);

    // Write the Groth header section
    ///////////

    await startWriteSection(fdZKey, 2);
    const primeQ = curve.q;
    const n8q = (Math.floor( (ffjavascript.Scalar.bitLength(primeQ) - 1) / 64) +1)*8;

    const primeR = curve.r;
    const n8r = (Math.floor( (ffjavascript.Scalar.bitLength(primeR) - 1) / 64) +1)*8;
    const Rr = ffjavascript.Scalar.mod(ffjavascript.Scalar.shl(1, n8r*8), primeR);
    const R2r = curve.Fr.e(ffjavascript.Scalar.mod(ffjavascript.Scalar.mul(Rr,Rr), primeR));

    await fdZKey.writeULE32(n8q);
    await writeBigInt(fdZKey, primeQ, n8q);
    await fdZKey.writeULE32(n8r);
    await writeBigInt(fdZKey, primeR, n8r);
    await fdZKey.writeULE32(r1cs.nVars);                         // Total number of bars
    await fdZKey.writeULE32(nPublic);                       // Total number of public vars (not including ONE)
    await fdZKey.writeULE32(domainSize);                  // domainSize

    let bAlpha1;
    bAlpha1 = await fdPTau.read(sG1, sectionsPTau[4][0].p);
    await fdZKey.write(bAlpha1);
    bAlpha1 = await curve.G1.batchLEMtoU(bAlpha1);
    csHasher.update(bAlpha1);

    let bBeta1;
    bBeta1 = await fdPTau.read(sG1, sectionsPTau[5][0].p);
    await fdZKey.write(bBeta1);
    bBeta1 = await curve.G1.batchLEMtoU(bBeta1);
    csHasher.update(bBeta1);

    let bBeta2;
    bBeta2 = await fdPTau.read(sG2, sectionsPTau[6][0].p);
    await fdZKey.write(bBeta2);
    bBeta2 = await curve.G2.batchLEMtoU(bBeta2);
    csHasher.update(bBeta2);

    const bg1 = new Uint8Array(sG1);
    curve.G1.toRprLEM(bg1, 0, curve.G1.g);
    const bg2 = new Uint8Array(sG2);
    curve.G2.toRprLEM(bg2, 0, curve.G2.g);
    const bg1U = new Uint8Array(sG1);
    curve.G1.toRprUncompressed(bg1U, 0, curve.G1.g);
    const bg2U = new Uint8Array(sG2);
    curve.G2.toRprUncompressed(bg2U, 0, curve.G2.g);

    await fdZKey.write(bg2);        // gamma2
    await fdZKey.write(bg1);        // delta1
    await fdZKey.write(bg2);        // delta2
    csHasher.update(bg2U);      // gamma2
    csHasher.update(bg1U);      // delta1
    csHasher.update(bg2U);      // delta2
    await endWriteSection(fdZKey);

    if (logger) logger.info("Reading r1cs");
    let sR1cs = await readSection(fdR1cs, sectionsR1cs, 2);

    const A = new BigArray$1(r1cs.nVars);
    const B1 = new BigArray$1(r1cs.nVars);
    const B2 = new BigArray$1(r1cs.nVars);
    const C = new BigArray$1(r1cs.nVars- nPublic -1);
    const IC = new Array(nPublic+1);

    if (logger) logger.info("Reading tauG1");
    let sTauG1 = await readSection(fdPTau, sectionsPTau, 12, (domainSize -1)*sG1, domainSize*sG1);
    if (logger) logger.info("Reading tauG2");
    let sTauG2 = await readSection(fdPTau, sectionsPTau, 13, (domainSize -1)*sG2, domainSize*sG2);
    if (logger) logger.info("Reading alphatauG1");
    let sAlphaTauG1 = await readSection(fdPTau, sectionsPTau, 14, (domainSize -1)*sG1, domainSize*sG1);
    if (logger) logger.info("Reading betatauG1");
    let sBetaTauG1 = await readSection(fdPTau, sectionsPTau, 15, (domainSize -1)*sG1, domainSize*sG1);

    await processConstraints();

    await composeAndWritePoints(3, "G1", IC, "IC");

    await writeHs();

    await hashHPoints();

    await composeAndWritePoints(8, "G1", C, "C");
    await composeAndWritePoints(5, "G1", A, "A");
    await composeAndWritePoints(6, "G1", B1, "B1");
    await composeAndWritePoints(7, "G2", B2, "B2");

    const csHash = csHasher.digest();
    // Contributions section
    await startWriteSection(fdZKey, 10);
    await fdZKey.write(csHash);
    await fdZKey.writeULE32(0);
    await endWriteSection(fdZKey);

    if (logger) logger.info(formatHash(csHash, "Circuit hash: "));


    await fdZKey.close();
    await fdR1cs.close();
    await fdPTau.close();

    return csHash;

    async function writeHs() {
        await startWriteSection(fdZKey, 9);
        const buffOut = new ffjavascript.BigBuffer(domainSize*sG1);
        if (cirPower < curve.Fr.s) {
            let sTauG1 = await readSection(fdPTau, sectionsPTau, 12, (domainSize*2-1)*sG1, domainSize*2*sG1);
            for (let i=0; i< domainSize; i++) {
                if ((logger)&&(i%10000 == 0)) logger.debug(`spliting buffer: ${i}/${domainSize}`);
                const buff = sTauG1.slice( (i*2+1)*sG1, (i*2+1)*sG1 + sG1 );
                buffOut.set(buff, i*sG1);
            }
        } else if (cirPower == curve.Fr.s) {
            const o = sectionsPTau[12][0].p + ((2 ** (cirPower+1)) -1)*sG1;
            await fdPTau.readToBuffer(buffOut, 0, domainSize*sG1, o + domainSize*sG1);
        } else {
            if (logger) logger.error("Circuit too big");
            throw new Error("Circuit too big for this curve");
        }
        await fdZKey.write(buffOut);
        await endWriteSection(fdZKey);
    }

    async function processConstraints() {
        const buffCoeff = new Uint8Array(12 + curve.Fr.n8);
        const buffCoeffV = new DataView(buffCoeff.buffer);
        const bOne = new Uint8Array(curve.Fr.n8);
        curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));

        let r1csPos = 0;

        function r1cs_readULE32() {
            const buff = sR1cs.slice(r1csPos, r1csPos+4);
            r1csPos += 4;
            const buffV = new DataView(buff.buffer);
            return buffV.getUint32(0, true);
        }

        const coefs = new BigArray$1();
        for (let c=0; c<r1cs.nConstraints; c++) {
            if ((logger)&&(c%10000 == 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
            const nA = r1cs_readULE32();
            for (let i=0; i<nA; i++) {
                const s = r1cs_readULE32();
                const coefp = r1csPos;
                r1csPos += curve.Fr.n8;

                const l1t = TAU_G1;
                const l1 = sG1*c;
                const l2t = BETATAU_G1;
                const l2 = sG1*c;
                if (typeof A[s] === "undefined") A[s] = [];
                A[s].push([l1t, l1, coefp]);

                if (s <= nPublic) {
                    if (typeof IC[s] === "undefined") IC[s] = [];
                    IC[s].push([l2t, l2, coefp]);
                } else {
                    if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                    C[s - nPublic -1].push([l2t, l2, coefp]);
                }
                coefs.push([0, c, s, coefp]);
            }

            const nB = r1cs_readULE32();
            for (let i=0; i<nB; i++) {
                const s = r1cs_readULE32();
                const coefp = r1csPos;
                r1csPos += curve.Fr.n8;

                const l1t = TAU_G1;
                const l1 = sG1*c;
                const l2t = TAU_G2;
                const l2 = sG2*c;
                const l3t = ALPHATAU_G1;
                const l3 = sG1*c;
                if (typeof B1[s] === "undefined") B1[s] = [];
                B1[s].push([l1t, l1, coefp]);
                if (typeof B2[s] === "undefined") B2[s] = [];
                B2[s].push([l2t, l2, coefp]);

                if (s <= nPublic) {
                    if (typeof IC[s] === "undefined") IC[s] = [];
                    IC[s].push([l3t, l3, coefp]);
                } else {
                    if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                    C[s- nPublic -1].push([l3t, l3, coefp]);
                }

                coefs.push([1, c, s, coefp]);
            }

            const nC = r1cs_readULE32();
            for (let i=0; i<nC; i++) {
                const s = r1cs_readULE32();
                const coefp = r1csPos;
                r1csPos += curve.Fr.n8;

                const l1t = TAU_G1;
                const l1 = sG1*c;
                if (s <= nPublic) {
                    if (typeof IC[s] === "undefined") IC[s] = [];
                    IC[s].push([l1t, l1, coefp]);
                } else {
                    if (typeof C[s- nPublic -1] === "undefined") C[s- nPublic -1] = [];
                    C[s- nPublic -1].push([l1t, l1, coefp]);
                }
            }
        }

        for (let s = 0; s <= nPublic ; s++) {
            const l1t = TAU_G1;
            const l1 = sG1*(r1cs.nConstraints + s);
            const l2t = BETATAU_G1;
            const l2 = sG1*(r1cs.nConstraints + s);
            if (typeof A[s] === "undefined") A[s] = [];
            A[s].push([l1t, l1, -1]);
            if (typeof IC[s] === "undefined") IC[s] = [];
            IC[s].push([l2t, l2, -1]);
            coefs.push([0, r1cs.nConstraints + s, s, -1]);
        }


        await startWriteSection(fdZKey, 4);

        const buffSection = new ffjavascript.BigBuffer(coefs.length*(12+curve.Fr.n8) + 4);

        const buff4 = new Uint8Array(4);
        const buff4V = new DataView(buff4.buffer);
        buff4V.setUint32(0, coefs.length, true);
        buffSection.set(buff4);
        let coefsPos = 4;
        for (let i=0; i<coefs.length; i++) {
            if ((logger)&&(i%100000 == 0)) logger.debug(`writing coeffs: ${i}/${coefs.length}`);
            writeCoef(coefs[i]);
        }

        await fdZKey.write(buffSection);
        await endWriteSection(fdZKey);

        function writeCoef(c) {
            buffCoeffV.setUint32(0, c[0], true);
            buffCoeffV.setUint32(4, c[1], true);
            buffCoeffV.setUint32(8, c[2], true);
            let n;
            if (c[3]>=0) {
                n = curve.Fr.fromRprLE(sR1cs.slice(c[3], c[3] + curve.Fr.n8), 0);
            } else {
                n = curve.Fr.fromRprLE(bOne, 0);
            }
            const nR2 = curve.Fr.mul(n, R2r);
            curve.Fr.toRprLE(buffCoeff, 12, nR2);
            buffSection.set(buffCoeff, coefsPos);
            coefsPos += buffCoeff.length;
        }

    }

    async function composeAndWritePoints(idSection, groupName, arr, sectionName) {
        const CHUNK_SIZE= 1<<15;
        const G = curve[groupName];

        hashU32(arr.length);
        await startWriteSection(fdZKey, idSection);

        let opPromises = [];

        let i=0;
        while (i<arr.length) {

            let t=0;
            while ((i<arr.length)&&(t<curve.tm.concurrency)) {
                if (logger)  logger.debug(`Writing points start ${sectionName}: ${i}/${arr.length}`);
                let n = 1;
                let nP = (arr[i] ? arr[i].length : 0);
                while ((i + n < arr.length) && (nP + (arr[i+n] ? arr[i+n].length : 0) < CHUNK_SIZE) && (n<CHUNK_SIZE)) {
                    nP += (arr[i+n] ? arr[i+n].length : 0);
                    n ++;
                }
                const subArr = arr.slice(i, i + n);
                const _i = i;
                opPromises.push(composeAndWritePointsThread(groupName, subArr, logger, sectionName).then( (r) => {
                    if (logger)  logger.debug(`Writing points end ${sectionName}: ${_i}/${arr.length}`);
                    return r;
                }));
                i += n;
                t++;
            }

            const result = await Promise.all(opPromises);

            for (let k=0; k<result.length; k++) {
                await fdZKey.write(result[k][0]);
                const buff = await G.batchLEMtoU(result[k][0]);
                csHasher.update(buff);
            }
            opPromises = [];

        }
        await endWriteSection(fdZKey);

    }

    async function composeAndWritePointsThread(groupName, arr, logger, sectionName) {
        const G = curve[groupName];
        const sGin = G.F.n8*2;
        const sGmid = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnExp, fnMultiExp, fnBatchToAffine, fnZero;
        if (groupName == "G1") {
            fnExp = "g1m_timesScalarAffine";
            fnMultiExp = "g1m_multiexpAffine";
            fnBatchToAffine = "g1m_batchToAffine";
            fnZero = "g1m_zero";
        } else if (groupName == "G2") {
            fnExp = "g2m_timesScalarAffine";
            fnMultiExp = "g2m_multiexpAffine";
            fnBatchToAffine = "g2m_batchToAffine";
            fnZero = "g2m_zero";
        } else {
            throw new Error("Invalid group");
        }
        let acc =0;
        for (let i=0; i<arr.length; i++) acc += arr[i] ? arr[i].length : 0;
        let bBases, bScalars;
        if (acc> 2<<14) {
            bBases = new ffjavascript.BigBuffer(acc*sGin);
            bScalars = new ffjavascript.BigBuffer(acc*curve.Fr.n8);
        } else {
            bBases = new Uint8Array(acc*sGin);
            bScalars = new Uint8Array(acc*curve.Fr.n8);
        }
        let pB =0;
        let pS =0;

        const sBuffs = [
            sTauG1,
            sTauG2,
            sAlphaTauG1,
            sBetaTauG1
        ];

        const bOne = new Uint8Array(curve.Fr.n8);
        curve.Fr.toRprLE(bOne, 0, curve.Fr.e(1));

        let offset = 0;
        for (let i=0; i<arr.length; i++) {
            if (!arr[i]) continue;
            for (let j=0; j<arr[i].length; j++) {
                if ((logger)&&(j)&&(j%10000 == 0))  logger.debug(`Configuring big array ${sectionName}: ${j}/${arr[i].length}`);
                bBases.set(
                    sBuffs[arr[i][j][0]].slice(
                        arr[i][j][1],
                        arr[i][j][1] + sGin
                    ), offset*sGin
                );
                if (arr[i][j][2]>=0) {
                    bScalars.set(
                        sR1cs.slice(
                            arr[i][j][2],
                            arr[i][j][2] + curve.Fr.n8
                        ),
                        offset*curve.Fr.n8
                    );
                } else {
                    bScalars.set(bOne, offset*curve.Fr.n8);
                }
                offset ++;
            }
        }

        if (arr.length>1) {
            const task = [];
            task.push({cmd: "ALLOCSET", var: 0, buff: bBases});
            task.push({cmd: "ALLOCSET", var: 1, buff: bScalars});
            task.push({cmd: "ALLOC", var: 2, len: arr.length*sGmid});
            pB = 0;
            pS = 0;
            let pD =0;
            for (let i=0; i<arr.length; i++) {
                if (!arr[i]) {
                    task.push({cmd: "CALL", fnName: fnZero, params: [
                        {var: 2, offset: pD}
                    ]});
                    pD += sGmid;
                    continue;
                }
                if (arr[i].length == 1) {
                    task.push({cmd: "CALL", fnName: fnExp, params: [
                        {var: 0, offset: pB},
                        {var: 1, offset: pS},
                        {val: curve.Fr.n8},
                        {var: 2, offset: pD}
                    ]});
                } else {
                    task.push({cmd: "CALL", fnName: fnMultiExp, params: [
                        {var: 0, offset: pB},
                        {var: 1, offset: pS},
                        {val: curve.Fr.n8},
                        {val: arr[i].length},
                        {var: 2, offset: pD}
                    ]});
                }
                pB += sGin*arr[i].length;
                pS += curve.Fr.n8*arr[i].length;
                pD += sGmid;
            }
            task.push({cmd: "CALL", fnName: fnBatchToAffine, params: [
                {var: 2},
                {val: arr.length},
                {var: 2},
            ]});
            task.push({cmd: "GET", out: 0, var: 2, len: arr.length*sGout});

            const res = await curve.tm.queueAction(task);
            return res;
        } else {
            let res = await G.multiExpAffine(bBases, bScalars, logger, sectionName);
            res = [ G.toAffine(res) ];
            return res;
        }
    }


    async function hashHPoints() {
        const CHUNK_SIZE = 1<<14;

        hashU32(domainSize-1);

        for (let i=0; i<domainSize-1; i+= CHUNK_SIZE) {
            if (logger)  logger.debug(`HashingHPoints: ${i}/${domainSize}`);
            const n = Math.min(domainSize-1, CHUNK_SIZE);
            await hashHPointsChunk(i, n);
        }
    }

    async function hashHPointsChunk(offset, nPoints) {
        const buff1 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + (offset + domainSize)*sG1);
        const buff2 = await fdPTau.read(nPoints *sG1, sectionsPTau[2][0].p + offset*sG1);
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(hashHPointsThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        for (let i=0; i<result.length; i++) {
            csHasher.update(result[i][0]);
        }
    }

    async function hashHPointsThread(buff1, buff2) {
        const nPoints = buff1.byteLength/sG1;
        const sGmid = curve.G1.F.n8*3;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "CALL", fnName: "g1m_batchLEMtoU", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

    function hashU32(n) {
        const buff = new Uint8Array(4);
        const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
        buffV.setUint32(0, n, false);
        csHasher.update(buff);
    }

}

async function phase2exportMPCParams(zkeyName, mpcparamsName, logger) {

    const {fd: fdZKey, sections: sectionsZKey} = await readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader(fdZKey, sectionsZKey, "groth16");

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const mpcParams = await readMPCParams(fdZKey, curve, sectionsZKey);

    const fdMPCParams = await createOverride(mpcparamsName);

    /////////////////////
    // Verification Key Section
    /////////////////////
    await writeG1(zkey.vk_alpha_1);
    await writeG1(zkey.vk_beta_1);
    await writeG2(zkey.vk_beta_2);
    await writeG2(zkey.vk_gamma_2);
    await writeG1(zkey.vk_delta_1);
    await writeG2(zkey.vk_delta_2);

    // IC
    let buffBasesIC;
    buffBasesIC = await readSection(fdZKey, sectionsZKey, 3);
    buffBasesIC = await curve.G1.batchLEMtoU(buffBasesIC);

    await writePointArray("G1", buffBasesIC);

    /////////////////////
    // h Section
    /////////////////////
    const buffBasesH_Lodd = await readSection(fdZKey, sectionsZKey, 9);

    let buffBasesH_Tau;
    buffBasesH_Tau = await curve.G1.fft(buffBasesH_Lodd, "affine", "jacobian", logger);
    buffBasesH_Tau = await curve.G1.batchApplyKey(buffBasesH_Tau, curve.Fr.neg(curve.Fr.e(2)), curve.Fr.w[zkey.power+1], "jacobian", "affine", logger);

    // Remove last element.  (The degree of H will be allways m-2)
    buffBasesH_Tau = buffBasesH_Tau.slice(0, buffBasesH_Tau.byteLength - sG1);
    buffBasesH_Tau = await curve.G1.batchLEMtoU(buffBasesH_Tau);
    await writePointArray("G1", buffBasesH_Tau);

    /////////////////////
    // L section
    /////////////////////
    let buffBasesC;
    buffBasesC = await readSection(fdZKey, sectionsZKey, 8);
    buffBasesC = await curve.G1.batchLEMtoU(buffBasesC);
    await writePointArray("G1", buffBasesC);

    /////////////////////
    // A Section (C section)
    /////////////////////
    let buffBasesA;
    buffBasesA = await readSection(fdZKey, sectionsZKey, 5);
    buffBasesA = await curve.G1.batchLEMtoU(buffBasesA);
    await writePointArray("G1", buffBasesA);

    /////////////////////
    // B1 Section
    /////////////////////
    let buffBasesB1;
    buffBasesB1 = await readSection(fdZKey, sectionsZKey, 6);
    buffBasesB1 = await curve.G1.batchLEMtoU(buffBasesB1);
    await writePointArray("G1", buffBasesB1);

    /////////////////////
    // B2 Section
    /////////////////////
    let buffBasesB2;
    buffBasesB2 = await readSection(fdZKey, sectionsZKey, 7);
    buffBasesB2 = await curve.G2.batchLEMtoU(buffBasesB2);
    await writePointArray("G2", buffBasesB2);

    await fdMPCParams.write(mpcParams.csHash);
    await writeU32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG2(c.delta.g2_spx);
        await fdMPCParams.write(c.transcript);
    }

    await fdZKey.close();
    await fdMPCParams.close();

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprUncompressed(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprUncompressed(buff, 0, P);
        await fdMPCParams.write(buff);
    }

    async function writePointArray(groupName, buff) {
        let sG;
        if (groupName == "G1") {
            sG = sG1;
        } else {
            sG = sG2;
        }

        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, buff.byteLength / sG, false);

        await fdMPCParams.write(buffSize);
        await fdMPCParams.write(buff);
    }

    async function writeU32(n) {
        const buffSize = new Uint8Array(4);
        const buffSizeV = new DataView(buffSize.buffer, buffSize.byteOffset, buffSize.byteLength);
        buffSizeV.setUint32(0, n, false);

        await fdMPCParams.write(buffSize);
    }



}

async function phase2importMPCParams(zkeyNameOld, mpcparamsName, zkeyNameNew, name, logger) {

    const {fd: fdZKeyOld, sections: sectionsZKeyOld} = await readBinFile(zkeyNameOld, "zkey", 2);
    const zkeyHeader = await readHeader(fdZKeyOld, sectionsZKeyOld, "groth16");

    const curve = await getCurveFromQ(zkeyHeader.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const oldMPCParams = await readMPCParams(fdZKeyOld, curve, sectionsZKeyOld);
    const newMPCParams = {};

    const fdMPCParams = await readExisting$2(mpcparamsName);

    fdMPCParams.pos =
        sG1*3 + sG2*3 +                     // vKey
        8 + sG1*zkeyHeader.nVars +              // IC + C
        4 + sG1*(zkeyHeader.domainSize-1) +     // H
        4 + sG1*zkeyHeader.nVars +              // A
        4 + sG1*zkeyHeader.nVars +              // B1
        4 + sG2*zkeyHeader.nVars;               // B2

    // csHash
    newMPCParams.csHash =  await fdMPCParams.read(64);

    const nConttributions = await fdMPCParams.readUBE32();
    newMPCParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1(fdMPCParams);
        c.delta.g1_s = await readG1(fdMPCParams);
        c.delta.g1_sx = await readG1(fdMPCParams);
        c.delta.g2_spx = await readG2(fdMPCParams);
        c.transcript = await fdMPCParams.read(64);
        if (i<oldMPCParams.contributions.length) {
            c.type = oldMPCParams.contributions[i].type;
            if (c.type==1) {
                c.beaconHash = oldMPCParams.contributions[i].beaconHash;
                c.numIterationsExp = oldMPCParams.contributions[i].numIterationsExp;
            }
            if (oldMPCParams.contributions[i].name) {
                c.name = oldMPCParams.contributions[i].name;
            }
        }
        newMPCParams.contributions.push(c);
    }

    if (!hashIsEqual(newMPCParams.csHash, oldMPCParams.csHash)) {
        if (logger) logger.error("Hash of the original circuit does not match with the MPC one");
        return false;
    }

    if (oldMPCParams.contributions.length > newMPCParams.contributions.length) {
        if (logger) logger.error("The impoerted file does not include new contributions");
        return false;
    }

    for (let i=0; i<oldMPCParams.contributions.length; i++) {
        if (!contributionIsEqual(oldMPCParams.contributions[i], newMPCParams.contributions[i])) {
            if (logger) logger.error(`Previos contribution ${i} does not match`);
            return false;
        }
    }


    // Set the same name to all new controbutions
    if (name) {
        for (let i=oldMPCParams.contributions.length; i<newMPCParams.contributions.length; i++) {
            newMPCParams.contributions[i].name = name;
        }
    }

    const fdZKeyNew = await createBinFile(zkeyNameNew, "zkey", 1, 10);
    fdMPCParams.pos = 0;

    // Header
    fdMPCParams.pos += sG1;  // ignore alpha1 (keep original)
    fdMPCParams.pos += sG1;  // ignore beta1
    fdMPCParams.pos += sG2;  // ignore beta2
    fdMPCParams.pos += sG2;  // ignore gamma2
    zkeyHeader.vk_delta_1 = await readG1(fdMPCParams);
    zkeyHeader.vk_delta_2 = await readG2(fdMPCParams);
    await writeHeader(fdZKeyNew, zkeyHeader);

    // IC (Keep original)
    const nIC = await fdMPCParams.readUBE32();
    if (nIC != zkeyHeader.nPublic +1) {
        if (logger) logger.error("Invalid number of points in IC");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nPublic+1);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 3);

    // Coeffs (Keep original)
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 4);

    // H Section
    const nH = await fdMPCParams.readUBE32();
    if (nH != zkeyHeader.domainSize-1) {
        if (logger) logger.error("Invalid number of points in H");
        await fdZKeyNew.discard();
        return false;
    }
    let buffH;
    const buffTauU = await fdMPCParams.read(sG1*(zkeyHeader.domainSize-1));
    const buffTauLEM = await curve.G1.batchUtoLEM(buffTauU);
    buffH = new Uint8Array(zkeyHeader.domainSize*sG1);
    buffH.set(buffTauLEM);   // Let the last one to zero.
    curve.G1.toRprLEM(buffH, sG1*(zkeyHeader.domainSize-1), curve.G1.zeroAffine);
    const n2Inv = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
    const wInv = curve.Fr.inv(curve.Fr.w[zkeyHeader.power+1]);
    buffH = await curve.G1.batchApplyKey(buffH, n2Inv, wInv, "affine", "jacobian", logger);
    buffH = await curve.G1.ifft(buffH, "jacobian", "affine", logger);
    await startWriteSection(fdZKeyNew, 9);
    await fdZKeyNew.write(buffH);
    await endWriteSection(fdZKeyNew);

    // C Secion (L section)
    const nL = await fdMPCParams.readUBE32();
    if (nL != (zkeyHeader.nVars-zkeyHeader.nPublic-1)) {
        if (logger) logger.error("Invalid number of points in L");
        await fdZKeyNew.discard();
        return false;
    }
    let buffL;
    buffL = await fdMPCParams.read(sG1*(zkeyHeader.nVars-zkeyHeader.nPublic-1));
    buffL = await curve.G1.batchUtoLEM(buffL);
    await startWriteSection(fdZKeyNew, 8);
    await fdZKeyNew.write(buffL);
    await endWriteSection(fdZKeyNew);

    // A Section
    const nA = await fdMPCParams.readUBE32();
    if (nA != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in A");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 5);

    // B1 Section
    const nB1 = await fdMPCParams.readUBE32();
    if (nB1 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B1");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG1*(zkeyHeader.nVars);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 6);

    // B2 Section
    const nB2 = await fdMPCParams.readUBE32();
    if (nB2 != zkeyHeader.nVars) {
        if (logger) logger.error("Invalid number of points in B2");
        await fdZKeyNew.discard();
        return false;
    }
    fdMPCParams.pos += sG2*(zkeyHeader.nVars);
    await copySection(fdZKeyOld, sectionsZKeyOld, fdZKeyNew, 7);

    await writeMPCParams(fdZKeyNew, curve, newMPCParams);

    await fdMPCParams.close();
    await fdZKeyNew.close();
    await fdZKeyOld.close();

    return true;

    async function readG1(fd) {
        const buff = await fd.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2(fd) {
        const buff = await fd.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }


    function contributionIsEqual(c1, c2) {
        if (!curve.G1.eq(c1.deltaAfter   , c2.deltaAfter)) return false;
        if (!curve.G1.eq(c1.delta.g1_s   , c2.delta.g1_s)) return false;
        if (!curve.G1.eq(c1.delta.g1_sx  , c2.delta.g1_sx)) return false;
        if (!curve.G2.eq(c1.delta.g2_spx , c2.delta.g2_spx)) return false;
        if (!hashIsEqual(c1.transcript, c2.transcript)) return false;
        return true;
    }


}

const sameRatio$2 = sameRatio;



async function phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger) {

    let sr;
    await Blake2b.ready();

    const {fd, sections} = await readBinFile(zkeyFileName, "zkey", 2);
    const zkey = await readHeader(fd, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const mpcParams = await readMPCParams(fd, curve, sections);

    const accumulatedHasher = Blake2b(64);
    accumulatedHasher.update(mpcParams.csHash);
    let curDelta = curve.G1.g;
    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        const ourHasher = cloneHasher(accumulatedHasher);

        hashG1(ourHasher, curve, c.delta.g1_s);
        hashG1(ourHasher, curve, c.delta.g1_sx);

        if (!hashIsEqual(ourHasher.digest(), c.transcript)) {
            console.log(`INVALID(${i}): Inconsistent transcript `);
            return false;
        }

        const delta_g2_sp = hashToG2(curve, c.transcript);

        sr = await sameRatio$2(curve, c.delta.g1_s, c.delta.g1_sx, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): public key G1 and G2 do not have the same ration `);
            return false;
        }

        sr = await sameRatio$2(curve, curDelta, c.deltaAfter, delta_g2_sp, c.delta.g2_spx);
        if (sr !== true) {
            console.log(`INVALID(${i}): deltaAfter does not fillow the public key `);
            return false;
        }

        if (c.type == 1) {
            const rng = rngFromBeaconParams(c.beaconHash, c.numIterationsExp);
            const expected_prvKey = curve.Fr.fromRng(rng);
            const expected_g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
            const expected_g1_sx = curve.G1.toAffine(curve.G1.timesFr(expected_g1_s, expected_prvKey));
            if (curve.G1.eq(expected_g1_s, c.delta.g1_s) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_s `);
                return false;
            }
            if (curve.G1.eq(expected_g1_sx, c.delta.g1_sx) !== true) {
                console.log(`INVALID(${i}): Key of the beacon does not match. g1_sx `);
                return false;
            }
        }

        hashPubKey(accumulatedHasher, curve, c);

        const contributionHasher = Blake2b(64);
        hashPubKey(contributionHasher, curve, c);

        c.contributionHash = contributionHasher.digest();

        curDelta = c.deltaAfter;
    }


    const {fd: fdInit, sections: sectionsInit} = await readBinFile(initFileName, "zkey", 2);
    const zkeyInit = await readHeader(fdInit, sectionsInit, "groth16");

    if (  (!ffjavascript.Scalar.eq(zkeyInit.q, zkey.q))
        ||(!ffjavascript.Scalar.eq(zkeyInit.r, zkey.r))
        ||(zkeyInit.n8q != zkey.n8q)
        ||(zkeyInit.n8r != zkey.n8r))
    {
        if (logger) logger.error("INVALID:  Different curves");
        return false;
    }

    if (  (zkeyInit.nVars != zkey.nVars)
        ||(zkeyInit.nPublic !=  zkey.nPublic)
        ||(zkeyInit.domainSize != zkey.domainSize))
    {
        if (logger) logger.error("INVALID:  Different circuit parameters");
        return false;
    }

    if (!curve.G1.eq(zkey.vk_alpha_1, zkeyInit.vk_alpha_1)) {
        if (logger) logger.error("INVALID:  Invalid alpha1");
        return false;
    }
    if (!curve.G1.eq(zkey.vk_beta_1, zkeyInit.vk_beta_1)) {
        if (logger) logger.error("INVALID:  Invalid beta1");
        return false;
    }
    if (!curve.G2.eq(zkey.vk_beta_2, zkeyInit.vk_beta_2)) {
        if (logger) logger.error("INVALID:  Invalid beta2");
        return false;
    }
    if (!curve.G2.eq(zkey.vk_gamma_2, zkeyInit.vk_gamma_2)) {
        if (logger) logger.error("INVALID:  Invalid gamma2");
        return false;
    }
    if (!curve.G1.eq(zkey.vk_delta_1, curDelta)) {
        if (logger) logger.error("INVALID:  Invalid delta1");
        return false;
    }
    sr = await sameRatio$2(curve, curve.G1.g, curDelta, curve.G2.g, zkey.vk_delta_2);
    if (sr !== true) {
        if (logger) logger.error("INVALID:  Invalid delta2");
        return false;
    }

    const mpcParamsInit = await readMPCParams(fdInit, curve, sectionsInit);
    if (!hashIsEqual(mpcParams.csHash, mpcParamsInit.csHash)) {
        if (logger) logger.error("INVALID:  Circuit does not match");
        return false;
    }

    // Check sizes of sections
    if (sections[8][0].size != sG1*(zkey.nVars-zkey.nPublic-1)) {
        if (logger) logger.error("INVALID:  Invalid L section size");
        return false;
    }

    if (sections[9][0].size != sG1*(zkey.domainSize)) {
        if (logger) logger.error("INVALID:  Invalid H section size");
        return false;
    }

    let ss;
    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 3);
    if (!ss) {
        if (logger) logger.error("INVALID:  IC section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 4);
    if (!ss) {
        if (logger) logger.error("Coeffs section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 5);
    if (!ss) {
        if (logger) logger.error("A section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 6);
    if (!ss) {
        if (logger) logger.error("B1 section is not identical");
        return false;
    }

    ss = await sectionIsEqual(fd, sections, fdInit, sectionsInit, 7);
    if (!ss) {
        if (logger) logger.error("B2 section is not identical");
        return false;
    }

    // Check L
    sr = await sectionHasSameRatio("G1", fdInit, sectionsInit, fd, sections, 8, zkey.vk_delta_2, zkeyInit.vk_delta_2, "L section");
    if (sr!==true) {
        if (logger) logger.error("L section does not match");
        return false;
    }

    // Check H
    sr = await sameRatioH();
    if (sr!==true) {
        if (logger) logger.error("H section does not match");
        return false;
    }

    if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));

    await fd.close();
    await fdInit.close();

    for (let i=mpcParams.contributions.length-1; i>=0; i--) {
        const c = mpcParams.contributions[i];
        if (logger) logger.info("-------------------------");
        if (logger) logger.info(formatHash(c.contributionHash, `contribution #${i+1} ${c.name ? c.name : ""}:`));
        if (c.type == 1) {
            if (logger) logger.info(`Beacon generator: ${byteArray2hex(c.beaconHash)}`);
            if (logger) logger.info(`Beacon iterations Exp: ${c.numIterationsExp}`);
        }
    }
    if (logger) logger.info("-------------------------");

    if (logger) logger.info("ZKey Ok!");

    return true;


    async function sectionHasSameRatio(groupName, fd1, sections1, fd2, sections2, idSection, g2sp, g2spx, sectionName) {
        const MAX_CHUNK_SIZE = 1<<20;
        const G = curve[groupName];
        const sG = G.F.n8*2;
        await startReadUniqueSection(fd1, sections1, idSection);
        await startReadUniqueSection(fd2, sections2, idSection);

        let R1 = G.zero;
        let R2 = G.zero;

        const nPoints = sections1[idSection][0].size / sG;

        for (let i=0; i<nPoints; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`Same ratio check ${sectionName}:  ${i}/${nPoints}`);
            const n = Math.min(nPoints - i, MAX_CHUNK_SIZE);
            const bases1 = await fd1.read(n*sG);
            const bases2 = await fd2.read(n*sG);

            const scalars = new Uint8Array(4*n);
            crypto.randomFillSync(scalars);


            const r1 = await G.multiExpAffine(bases1, scalars);
            const r2 = await G.multiExpAffine(bases2, scalars);

            R1 = G.add(R1, r1);
            R2 = G.add(R2, r2);
        }
        await endReadSection(fd1);
        await endReadSection(fd2);

        if (nPoints == 0) return true;

        sr = await sameRatio$2(curve, R1, R2, g2sp, g2spx);
        if (sr !== true) return false;

        return true;
    }

    async function sameRatioH() {
        const MAX_CHUNK_SIZE = 1<<20;
        const G = curve.G1;
        const Fr = curve.Fr;
        const sG = G.F.n8*2;

        const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(pTauFileName, "ptau", 1);

        let buff_r = new ffjavascript.BigBuffer(zkey.domainSize * zkey.n8r);

        const seed= new Array(8);
        for (let i=0; i<8; i++) {
            seed[i] = crypto.randomBytes(4).readUInt32BE(0, true);
        }
        const rng = new ffjavascript.ChaCha(seed);
        for (let i=0; i<zkey.domainSize-1; i++) {   // Note that last one is zero
            const e = Fr.fromRng(rng);
            Fr.toRprLE(buff_r, i*zkey.n8r, e);
        }
        Fr.toRprLE(buff_r, (zkey.domainSize-1)*zkey.n8r, Fr.zero);

        let R1 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verificaition(tau):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff1 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + zkey.domainSize*sG + i*sG);
            const buff2 = await fdPTau.read(sG*n, sectionsPTau[2][0].p + i*sG);

            const buffB = await batchSubstract(buff1, buff2);
            const buffS = buff_r.slice(i*zkey.n8r, (i+n)*zkey.n8r);
            const r = await G.multiExpAffine(buffB, buffS);

            R1 = G.add(R1, r);
        }

        // Caluclate odd coeficients in transformed domain

        buff_r = await Fr.batchToMontgomery(buff_r);
        // const first = curve.Fr.neg(curve.Fr.inv(curve.Fr.e(2)));
        // Works*2   const first = curve.Fr.neg(curve.Fr.e(2));


        let first;

        if (zkey.power < Fr.s) {
            first = Fr.neg(Fr.e(2));
        } else {
            const small_m  = 2 ** Fr.s;
            const shift_to_small_m = Fr.exp(Fr.shift, small_m);
            first = Fr.sub( shift_to_small_m, Fr.one);
        }

        // const inc = curve.Fr.inv(curve.PFr.w[zkey.power+1]);
        const inc = zkey.power < Fr.s ? Fr.w[zkey.power+1] : Fr.shift;
        buff_r = await Fr.batchApplyKey(buff_r, first, inc);
        buff_r = await Fr.fft(buff_r);
        buff_r = await Fr.batchFromMontgomery(buff_r);

        await startReadUniqueSection(fd, sections, 9);
        let R2 = G.zero;
        for (let i=0; i<zkey.domainSize; i += MAX_CHUNK_SIZE) {
            if (logger) logger.debug(`H Verificaition(lagrange):  ${i}/${zkey.domainSize}`);
            const n = Math.min(zkey.domainSize - i, MAX_CHUNK_SIZE);

            const buff = await fd.read(sG*n);
            const buffS = buff_r.slice(i*zkey.n8r, (i+n)*zkey.n8r);
            const r = await G.multiExpAffine(buff, buffS);

            R2 = G.add(R2, r);
        }
        await endReadSection(fd);

        sr = await sameRatio$2(curve, R1, R2, zkey.vk_delta_2, zkeyInit.vk_delta_2);
        if (sr !== true) return false;


        return true;

    }

    async function batchSubstract(buff1, buff2) {
        const sG = curve.G1.F.n8*2;
        const nPoints = buff1.byteLength / sG;
        const concurrency= curve.tm.concurrency;
        const nPointsPerThread = Math.floor(nPoints / concurrency);
        const opPromises = [];
        for (let i=0; i<concurrency; i++) {
            let n;
            if (i< concurrency-1) {
                n = nPointsPerThread;
            } else {
                n = nPoints - i*nPointsPerThread;
            }
            if (n==0) continue;

            const subBuff1 = buff1.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            const subBuff2 = buff2.slice(i*nPointsPerThread*sG1, (i*nPointsPerThread+n)*sG1);
            opPromises.push(batchSubstractThread(subBuff1, subBuff2));
        }


        const result = await Promise.all(opPromises);

        const fullBuffOut = new Uint8Array(nPoints*sG);
        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    }


    async function batchSubstractThread(buff1, buff2) {
        const sG1 = curve.G1.F.n8*2;
        const sGmid = curve.G1.F.n8*3;
        const nPoints = buff1.byteLength/sG1;
        const task = [];
        task.push({cmd: "ALLOCSET", var: 0, buff: buff1});
        task.push({cmd: "ALLOCSET", var: 1, buff: buff2});
        task.push({cmd: "ALLOC", var: 2, len: nPoints*sGmid});
        for (let i=0; i<nPoints; i++) {
            task.push({
                cmd: "CALL",
                fnName: "g1m_subAffine",
                params: [
                    {var: 0, offset: i*sG1},
                    {var: 1, offset: i*sG1},
                    {var: 2, offset: i*sGmid},
                ]
            });
        }
        task.push({cmd: "CALL", fnName: "g1m_batchToAffine", params: [
            {var: 2},
            {val: nPoints},
            {var: 2},
        ]});
        task.push({cmd: "GET", out: 0, var: 2, len: nPoints*sG1});

        const res = await curve.tm.queueAction(task);

        return res;
    }

}

async function phase2verifyFromR1cs(r1csFileName, pTauFileName, zkeyFileName, logger) {

    // const initFileName = "~" + zkeyFileName + ".init";
    const initFileName = {type: "bigMem"};
    await newZKey(r1csFileName, pTauFileName, initFileName, logger);

    return await phase2verifyFromInit(initFileName, pTauFileName, zkeyFileName, logger);
}

async function phase2contribute(zkeyNameOld, zkeyNameNew, name, entropy, logger) {
    await Blake2b.ready();

    const {fd: fdOld, sections: sections} = await readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await readHeader(fdOld, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);

    const mpcParams = await readMPCParams(fdOld, curve, sections);

    const fdNew = await createBinFile(zkeyNameNew, "zkey", 1, 10);


    const rng = await getRandomRng(entropy);

    const transcriptHasher = Blake2b(64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 0;
    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await writeHeader(fdNew, zkey);

    // IC
    await copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await copySection(fdOld, sections, fdNew, 4);

    // A Section
    await copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = Blake2b(64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(mpcParams.csHash, "Circuit Hash: "));
    if (logger) logger.info(formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}

async function beacon$1(zkeyNameOld, zkeyNameNew, name, beaconHashStr, numIterationsExp, logger) {
    await Blake2b.ready();

    const beaconHash = hex2ByteArray(beaconHashStr);
    if (   (beaconHash.byteLength == 0)
        || (beaconHash.byteLength*2 !=beaconHashStr.length))
    {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return false;
    }
    if (beaconHash.length>=256) {
        if (logger) logger.error("Maximum lenght of beacon hash is 255 bytes");
        return false;
    }

    numIterationsExp = parseInt(numIterationsExp);
    if ((numIterationsExp<10)||(numIterationsExp>63)) {
        if (logger) logger.error("Invalid numIterationsExp. (Must be between 10 and 63)");
        return false;
    }


    const {fd: fdOld, sections: sections} = await readBinFile(zkeyNameOld, "zkey", 2);
    const zkey = await readHeader(fdOld, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);

    const mpcParams = await readMPCParams(fdOld, curve, sections);

    const fdNew = await createBinFile(zkeyNameNew, "zkey", 1, 10);

    const rng = await rngFromBeaconParams(beaconHash, numIterationsExp);

    const transcriptHasher = Blake2b(64);
    transcriptHasher.update(mpcParams.csHash);
    for (let i=0; i<mpcParams.contributions.length; i++) {
        hashPubKey(transcriptHasher, curve, mpcParams.contributions[i]);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = curve.Fr.fromRng(rng);
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, curContribution.delta.prvKey));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, curContribution.delta.prvKey));

    zkey.vk_delta_1 = curve.G1.timesFr(zkey.vk_delta_1, curContribution.delta.prvKey);
    zkey.vk_delta_2 = curve.G2.timesFr(zkey.vk_delta_2, curContribution.delta.prvKey);

    curContribution.deltaAfter = zkey.vk_delta_1;

    curContribution.type = 1;
    curContribution.numIterationsExp = numIterationsExp;
    curContribution.beaconHash = beaconHash;

    if (name) curContribution.name = name;

    mpcParams.contributions.push(curContribution);

    await writeHeader(fdNew, zkey);

    // IC
    await copySection(fdOld, sections, fdNew, 3);

    // Coeffs (Keep original)
    await copySection(fdOld, sections, fdNew, 4);

    // A Section
    await copySection(fdOld, sections, fdNew, 5);

    // B1 Section
    await copySection(fdOld, sections, fdNew, 6);

    // B2 Section
    await copySection(fdOld, sections, fdNew, 7);

    const invDelta = curve.Fr.inv(curContribution.delta.prvKey);
    await applyKeyToSection(fdOld, sections, fdNew, 8, curve, "G1", invDelta, curve.Fr.e(1), "L Section", logger);
    await applyKeyToSection(fdOld, sections, fdNew, 9, curve, "G1", invDelta, curve.Fr.e(1), "H Section", logger);

    await writeMPCParams(fdNew, curve, mpcParams);

    await fdOld.close();
    await fdNew.close();

    const contributionHasher = Blake2b(64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contribuionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contribuionHash, "Contribution Hash: "));

    return contribuionHash;
}

async function zkeyExportJson(zkeyFileName, verbose) {

    const zKey = await readZKey(zkeyFileName);

    return zKey;
}

// Format of the output

async function bellmanContribute(curve, challengeFilename, responesFileName, entropy, logger) {
    await Blake2b.ready();

    const rng = await getRandomRng(entropy);

    const delta = curve.Fr.fromRng(rng);
    const invDelta = curve.Fr.inv(delta);

    const sG1 = curve.G1.F.n8*2;
    const sG2 = curve.G2.F.n8*2;

    const fdFrom = await readExisting$2(challengeFilename);
    const fdTo = await createOverride(responesFileName);


    await copy(sG1); // alpha1
    await copy(sG1); // beta1
    await copy(sG2); // beta2
    await copy(sG2); // gamma2
    const oldDelta1 = await readG1();
    const delta1 = curve.G1.timesFr(oldDelta1, delta);
    await writeG1(delta1);
    const oldDelta2 = await readG2();
    const delta2 = curve.G2.timesFr(oldDelta2, delta);
    await writeG2(delta2);

    // IC
    const nIC = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nIC);
    await copy(nIC*sG1);

    // H
    const nH = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nH);
    await applyKeyToChallengeSection(fdFrom, fdTo, null, curve, "G1", nH, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "H", logger);

    // L
    const nL = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nL);
    await applyKeyToChallengeSection(fdFrom, fdTo, null, curve, "G1", nL, invDelta, curve.Fr.e(1), "UNCOMPRESSED", "L", logger);

    // A
    const nA = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nA);
    await copy(nA*sG1);

    // B1
    const nB1 = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nB1);
    await copy(nB1*sG1);

    // B2
    const nB2 = await fdFrom.readUBE32();
    await fdTo.writeUBE32(nB2);
    await copy(nB2*sG2);


    //////////
    /// Read contributions
    //////////
    const transcriptHasher = Blake2b(64);

    const mpcParams = {};
    // csHash
    mpcParams.csHash =  await fdFrom.read(64);
    transcriptHasher.update(mpcParams.csHash);

    const nConttributions = await fdFrom.readUBE32();
    mpcParams.contributions = [];
    for (let i=0; i<nConttributions; i++) {
        const c = { delta:{} };
        c.deltaAfter = await readG1();
        c.delta.g1_s = await readG1();
        c.delta.g1_sx = await readG1();
        c.delta.g2_spx = await readG2();
        c.transcript = await fdFrom.read(64);
        mpcParams.contributions.push(c);
        hashPubKey(transcriptHasher, curve, c);
    }

    const curContribution = {};
    curContribution.delta = {};
    curContribution.delta.prvKey = delta;
    curContribution.delta.g1_s = curve.G1.toAffine(curve.G1.fromRng(rng));
    curContribution.delta.g1_sx = curve.G1.toAffine(curve.G1.timesFr(curContribution.delta.g1_s, delta));
    hashG1(transcriptHasher, curve, curContribution.delta.g1_s);
    hashG1(transcriptHasher, curve, curContribution.delta.g1_sx);
    curContribution.transcript = transcriptHasher.digest();
    curContribution.delta.g2_sp = hashToG2(curve, curContribution.transcript);
    curContribution.delta.g2_spx = curve.G2.toAffine(curve.G2.timesFr(curContribution.delta.g2_sp, delta));
    curContribution.deltaAfter = delta1;
    curContribution.type = 0;
    mpcParams.contributions.push(curContribution);


    //////////
    /// Write COntribution
    //////////

    await fdTo.write(mpcParams.csHash);
    await fdTo.writeUBE32(mpcParams.contributions.length);

    for (let i=0; i<mpcParams.contributions.length; i++) {
        const c = mpcParams.contributions[i];
        await writeG1(c.deltaAfter);
        await writeG1(c.delta.g1_s);
        await writeG1(c.delta.g1_sx);
        await writeG2(c.delta.g2_spx);
        await fdTo.write(c.transcript);
    }

    const contributionHasher = Blake2b(64);
    hashPubKey(contributionHasher, curve, curContribution);

    const contributionHash = contributionHasher.digest();

    if (logger) logger.info(formatHash(contributionHash, "Contribution Hash: "));

    await fdTo.close();
    await fdFrom.close();

    return contributionHash;

    async function copy(nBytes) {
        const CHUNK_SIZE = fdFrom.pageSize*2;
        for (let i=0; i<nBytes; i+= CHUNK_SIZE) {
            const n = Math.min(nBytes -i, CHUNK_SIZE);
            const buff = await fdFrom.read(n);
            await fdTo.write(buff);
        }
    }

    async function readG1() {
        const buff = await fdFrom.read(curve.G1.F.n8*2);
        return curve.G1.fromRprUncompressed(buff, 0);
    }

    async function readG2() {
        const buff = await fdFrom.read(curve.G2.F.n8*2);
        return curve.G2.fromRprUncompressed(buff, 0);
    }

    async function writeG1(P) {
        const buff = new Uint8Array(sG1);
        curve.G1.toRprUncompressed(buff, 0, P);
        await fdTo.write(buff);
    }

    async function writeG2(P) {
        const buff = new Uint8Array(sG2);
        curve.G2.toRprUncompressed(buff, 0, P);
        await fdTo.write(buff);
    }


}

const {stringifyBigInts: stringifyBigInts$2} = ffjavascript.utils;


async function zkeyExportVerificationKey(zkeyName, logger) {

    const {fd, sections} = await readBinFile(zkeyName, "zkey", 2);
    const zkey = await readHeader(fd, sections, "groth16");

    const curve = await getCurveFromQ(zkey.q);
    const sG1 = curve.G1.F.n8*2;

    const alphaBeta = await curve.pairing( zkey.vk_alpha_1 , zkey.vk_beta_2 );

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublic: zkey.nPublic,

        vk_alpha_1: curve.G1.toObject(zkey.vk_alpha_1),

        vk_beta_2: curve.G2.toObject(zkey.vk_beta_2),
        vk_gamma_2:  curve.G2.toObject(zkey.vk_gamma_2),
        vk_delta_2:  curve.G2.toObject(zkey.vk_delta_2),

        vk_alphabeta_12: curve.Gt.toObject(alphaBeta)
    };

    // Read IC Section
    ///////////
    await startReadUniqueSection(fd, sections, 3);
    vKey.IC = [];
    for (let i=0; i<= zkey.nPublic; i++) {
        const buff = await fd.read(sG1);
        const P = curve.G1.toObject(buff);
        vKey.IC.push(P);
    }
    await endReadSection(fd);

    vKey = stringifyBigInts$2(vKey);

    await fd.close();

    return vKey;
}

// Not ready yet
// module.exports.generateVerifier_kimleeoh = generateVerifier_kimleeoh;



async function exportSolidityVerifier(zKeyName, templateName, logger) {

    const verificationKey = await zkeyExportVerificationKey(zKeyName);

    const fd = await readExisting$2(templateName);
    const buff = await fd.read(fd.totalSize);
    let template = new TextDecoder("utf-8").decode(buff);

    const vkalpha1_str = `${verificationKey.vk_alpha_1[0].toString()},`+
                        `${verificationKey.vk_alpha_1[1].toString()}`;
    template = template.replace("<%vk_alpha1%>", vkalpha1_str);

    const vkbeta2_str = `[${verificationKey.vk_beta_2[0][1].toString()},`+
                         `${verificationKey.vk_beta_2[0][0].toString()}], `+
                        `[${verificationKey.vk_beta_2[1][1].toString()},` +
                         `${verificationKey.vk_beta_2[1][0].toString()}]`;
    template = template.replace("<%vk_beta2%>", vkbeta2_str);

    const vkgamma2_str = `[${verificationKey.vk_gamma_2[0][1].toString()},`+
                          `${verificationKey.vk_gamma_2[0][0].toString()}], `+
                         `[${verificationKey.vk_gamma_2[1][1].toString()},` +
                          `${verificationKey.vk_gamma_2[1][0].toString()}]`;
    template = template.replace("<%vk_gamma2%>", vkgamma2_str);

    const vkdelta2_str = `[${verificationKey.vk_delta_2[0][1].toString()},`+
                          `${verificationKey.vk_delta_2[0][0].toString()}], `+
                         `[${verificationKey.vk_delta_2[1][1].toString()},` +
                          `${verificationKey.vk_delta_2[1][0].toString()}]`;
    template = template.replace("<%vk_delta2%>", vkdelta2_str);

    // The points

    template = template.replace("<%vk_input_length%>", (verificationKey.IC.length-1).toString());
    template = template.replace("<%vk_ic_length%>", verificationKey.IC.length.toString());
    let vi = "";
    for (let i=0; i<verificationKey.IC.length; i++) {
        if (vi != "") vi = vi + "        ";
        vi = vi + `vk.IC[${i}] = Pairing.G1Point(${verificationKey.IC[i][0].toString()},`+
                                                `${verificationKey.IC[i][1].toString()});\n`;
    }
    template = template.replace("<%vk_ic_pts%>", vi);

    return template;
}

var zkey = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newZKey: newZKey,
    exportBellman: phase2exportMPCParams,
    importBellman: phase2importMPCParams,
    verifyFromR1cs: phase2verifyFromR1cs,
    verifyFromInit: phase2verifyFromInit,
    contribute: phase2contribute,
    beacon: beacon$1,
    exportJson: zkeyExportJson,
    bellmanContribute: bellmanContribute,
    exportVerificationKey: zkeyExportVerificationKey,
    exportSolidityVerifier: exportSolidityVerifier
});

exports.groth16 = groth16;
exports.powersOfTau = powersoftau;
exports.r1cs = r1cs;
exports.wtns = wtns;
exports.zKey = zkey;
