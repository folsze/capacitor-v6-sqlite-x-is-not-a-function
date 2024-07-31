import { Injectable } from '@angular/core';
import { SQLiteService } from './sqlite.service';
import { DatabaseService } from './database.service';
import { DbnameVersionService } from './dbname-version.service';
import { first } from 'rxjs';

export const topicModeLocationVersionUpgrades = [
  {
    toVersion: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS database (
        id INTEGER PRIMARY KEY CHECK (id = 1), -- THIS MAKES THIS A SINGLETON
        isInitialized INTEGER NOT NULL check (isInitialized between 0 and 1) DEFAULT 1 --boolean
      );`,
    ]
  },
];

@Injectable()
export class InitializeAppService {
  platform!: string;
  public databaseName!: string;

  private versionUpgrades = topicModeLocationVersionUpgrades;
  private loadToVersion = topicModeLocationVersionUpgrades[topicModeLocationVersionUpgrades.length-1].toVersion;

  constructor(
    private sqliteService: SQLiteService,
    private dbs: DatabaseService,
    private dbVerService: DbnameVersionService,
  ) {
    this.databaseName = "PENIS-DATABASE";
  }

  async initializeApp() {
    // console.time('⏰AppInitialization1');
    await this.sqliteService.initializePlugin().then(async (_) => {
      this.platform = this.sqliteService.platform;
      try {
        if(this.sqliteService.platform === 'web') {
          await this.sqliteService.initWebStore();
        }
        await this.initializeDatabase();
      } catch (error) {
        console.error(`initializeAppError: ${error}`);
        // console.timeEnd('⏰AppInitialization1');
        // console.timeEnd('⏰AppInitialization');
      }
    });
  }

  async initializeDatabase() {
    // create upgrade statements
    await this.sqliteService // NOTE: this initializes
      .addUpgradeStatement({ database: this.databaseName,
        upgrade: this.versionUpgrades});
    // create and/or open the database
    await this.dbs.openDatabase(this.databaseName, this.loadToVersion);
    this.dbVerService.set(this.databaseName, this.loadToVersion);
    // create database initial data

    this.dbs.getIsInitialized().pipe(first()).subscribe(async (databaseTableRows: { isInitialized: boolean }[]) => {
      if (!databaseTableRows) {
        /** CASE 1: impossible */
        console.error('Assertion failed: at this point, the database table should have been created', databaseTableRows);
      } else if (databaseTableRows.length === 0) {
        /** CASE 2: FIRST APP INSTALL */
        console.log('database was not there thus now createInitialData. databaseRows:', databaseTableRows);
      } else if (databaseTableRows.length === 1 && !databaseTableRows[0].isInitialized) {
        /** CASE 3: initial insert had begun but failed */
        console.log('initial insert had begun but failed. Hence, try it again');
      } else if (databaseTableRows.length === 1 && databaseTableRows[0].isInitialized) {
        /** CASE 4: normal app restart - check for corrupted users */
        console.log("normal app restart");
        // console.timeEnd('⏰AppInitialization');
        // console.timeEnd('⏰AppInitialization1');
      } else {
        throw new Error('Assertion failed: this cannot take place.');
      }

      if (this.sqliteService.platform === 'web') {
        await this.sqliteService.sqliteConnection.saveToStore(this.databaseName);
      }

    });
  }

}
