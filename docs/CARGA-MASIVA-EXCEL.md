# Plantilla Excel — carga masiva

Primera fila (headers, minúsculas sin espacios):

| ruc | codigoalumno | nombres | apellidos | fechainicio | fechafin | sueldo | anio | mescontratacion |
|-----|--------------|---------|-----------|-------------|----------|--------|------|-----------------|
| 20600987654 | A100 | Luis | Gómez | 2026-01-15 | 2026-04-15 | 1300 | 2026 | 1 |

Notas:

- Fechas en formato `YYYY-MM-DD` o serial Excel.
- El RUC debe existir en CRM (mock o sync previo).
- Periodo de vigencia: **meses enteros**; fracciones se marcan inválidas.
