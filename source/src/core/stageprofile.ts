// Namen der Ausgänge (z. B. „LED-Wand links“), im Projekt gespeichert. Beitrag von Fabian Schrader (fabianschr9).
export interface StageOutput { name: string; display: number }
export interface StageProfile { name: string; outputs: StageOutput[] }
