import type { DataSource } from "@/data/contracts/data-source";
import { mockDataSource } from "@/data/mock/mock-data-source";

/**
 * Fuente de datos activa consumida por toda la UI. Hoy es el simulador local;
 * el dia que exista backend, se implementa `DataSource` contra HTTP/WebSocket
 * y se reemplaza esta unica linea sin tocar componentes ni hooks.
 */
export const dataSource: DataSource = mockDataSource;
