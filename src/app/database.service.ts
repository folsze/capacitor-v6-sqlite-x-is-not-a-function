import {Injectable} from '@angular/core';
import {capSQLiteChanges, SQLiteDBConnection} from '@capacitor-community/sqlite';
import {catchError, from, map, Observable} from 'rxjs';
import {SQLiteService} from './sqlite.service';
import {Capacitor} from '@capacitor/core';

@Injectable()
export class DatabaseService {
  private mDb!: SQLiteDBConnection;
  private readonly platform: string;

  constructor(
    private sqliteService: SQLiteService
  ) {
    this.platform = Capacitor.getPlatform();
  }

  public setIsInitialDataInserted(isInitialized: boolean) {
    let stmt: string;
    if (isInitialized) {
      stmt = `UPDATE database SET isInitialized = 1 WHERE id = 1`;
    } else {
      stmt = `INSERT INTO database (id, isInitialized) VALUES (1, 0)`;
    }
    return this.dbRun(stmt);
  }

  public getIsInitialized(): Observable<{ isInitialized: boolean }[]> {
    const stmt = `SELECT isInitialized FROM database WHERE id = 1`;
    return this.dbQuery(stmt).pipe(
      map((results: any[] ) => results)
    );
  }

  public dbQuery<T>(stmt: string, stmtValues?: (string | number | null)[], debugInfo?: string): Observable<T[]> {
    return from(
      (async () => {
        let values;
        try { // NOTE: this try catch was necessary. Else the error wouldn't get output in the web-console AT ALL!
          values = (await this.mDb.query(stmt, stmtValues)).values;
        } catch (error: any) {
          console.error(error);
        }

        if (debugInfo) {
          console.log(debugInfo);
        }

        if (values === undefined) {
          console.error('Assertion failed: dbQuery failed:', stmt, stmtValues);
        } else if (values === null) {
          console.error('Assertion failed: WUTTT');
        }
        return values as T[];
      })()
    );
  }

  public dbRun(stmt: string, values?: (string | number | null)[], debugInfo?: string): Observable<capSQLiteChanges> {
    if (debugInfo) console.log('debugInfo', debugInfo);
    const transaction = ['ios', 'android'].includes(this.platform);
    return from(this.mDb.run(stmt, values, transaction)).pipe(
      catchError(err => {
        console.error(err);
        console.error(stmt, values);
        throw err; // re-throw the error so it can be caught in the calling function
      })
    );
  }

  async openDatabase(databaseName: string, loadToVersion: number): Promise<void> {
    this.mDb = await this.sqliteService
      .openDatabase(databaseName, false, "no-encryption", loadToVersion,false);
  }

}
