-- Una propuesta conserva sus datos operativos junto a la entrada que la originó.
ALTER TABLE entradas_cms ADD COLUMN objetivo TEXT NOT NULL DEFAULT '';
ALTER TABLE entradas_cms ADD COLUMN pasos TEXT NOT NULL DEFAULT '';
ALTER TABLE entradas_cms ADD COLUMN recursos TEXT NOT NULL DEFAULT '';
ALTER TABLE entradas_cms ADD COLUMN personas_necesarias TEXT NOT NULL DEFAULT '';
