export interface ISqlConfig {
  type: string;
  host: string;
  username: string;
  password: string;
  database: string;
  port: number;
  logging: boolean;
  entities: string[];
  migrationsRun: boolean;
  synchronize: boolean;
  cache: ICacheConfig;
}

export interface ICacheConfig {
  type: 'redis';
  options: {
    host: string;
    port: string;
  };
}
