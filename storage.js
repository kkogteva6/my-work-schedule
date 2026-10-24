/* All data changes and the previous version are committed in one IndexedDB transaction. */
(function (root) {
  'use strict';
  const LEGACY = 'my-work-schedule-v1';
  class Store {
    constructor() { this.db = null; this.revision = 0; this.savedAt = null; this.raw = null; }
    async open() {
      // Keep the legacy source exportable even if opening IndexedDB itself fails.
      try { this.raw = localStorage.getItem(LEGACY); } catch { /* Primary DB may still be available. */ }
      this.db = await new Promise((resolve,reject) => {
        const request = indexedDB.open('my-work-schedule', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore('records', {keyPath:'id'});
          db.createObjectStore('history', {keyPath:'id',autoIncrement:true});
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Закрой другие окна приложения и повтори запуск.'));
      });
      this.db.onversionchange = () => this.db.close();
      const record = await this.get('records','main');
      if (record) {
        this.revision = record.revision;
        this.savedAt = record.savedAt;
        this.raw = JSON.stringify(record);
        return ScheduleData.normalize(record.state);
      }
      // Do not remove the original legacy copy, even after successful migration.
      this.raw = localStorage.getItem(LEGACY);
      const state = this.raw === null
        ? ScheduleData.normalize({settings:ScheduleData.defaults,entries:{}})
        : ScheduleData.normalize(JSON.parse(this.raw));
      await this.commit(state, this.raw === null ? 'Первый запуск' : 'Перенос из предыдущей версии');
      return state;
    }
    get(store,key) {
      return new Promise((resolve,reject) => {
        const tx = this.db.transaction(store,'readonly');
        const req = tx.objectStore(store).get(key);
        tx.oncomplete = () => resolve(req.result);
        tx.onabort = () => reject(tx.error);
      });
    }
    async commit(input, reason='Изменение данных') {
      const state = ScheduleData.normalize(input);
      if (!this.db) throw new Error('Хранилище недоступно. Скачай копию и повтори запуск.');
      const revision = this.revision;
      const savedAt = new Date().toISOString();
      await new Promise((resolve,reject) => {
        const tx = this.db.transaction(['records','history'],'readwrite');
        let conflict = false;
        const records = tx.objectStore('records');
        const history = tx.objectStore('history');
        const request = records.get('main');
        request.onsuccess = () => {
          const old = request.result;
          if ((old?.revision ?? 0) !== revision) { conflict = true; tx.abort(); return; }
          if (old) history.add({state:old.state,savedAt:old.savedAt,reason});
          else if (this.raw) history.add({raw:this.raw,savedAt,reason:'Исходные данные до восстановления'});
          records.put({id:'main',state,revision:revision+1,savedAt});
          const keys = history.getAllKeys();
          keys.onsuccess = () => keys.result.slice(0,Math.max(0,keys.result.length-30)).forEach(key => history.delete(key));
        };
        tx.oncomplete = resolve;
        tx.onabort = () => reject(new Error(conflict ? 'Данные изменены в другом окне. Скачай несохранённую копию и перезагрузи приложение.' : 'Не удалось записать данные. Проверь свободное место.'));
        tx.onerror = () => {};
      });
      this.revision = revision+1;
      this.savedAt = savedAt;
      return state;
    }
    history() {
      return new Promise((resolve,reject) => {
        const tx = this.db.transaction('history','readonly');
        const req = tx.objectStore('history').getAll();
        tx.oncomplete = () => resolve(req.result.reverse());
        tx.onabort = () => reject(tx.error);
      });
    }
    async setMeta(id,value) {
      await new Promise((resolve,reject) => {
        const tx = this.db.transaction('records','readwrite');
        tx.objectStore('records').put({id,value});
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      });
    }
  }
  root.ScheduleStore = Store;
})(globalThis);
