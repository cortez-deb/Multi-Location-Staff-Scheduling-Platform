#!/bin/bash
find app -name page.tsx -o -name layout.tsx | while read file; do
  # Replace 'import { db }' with 'import { getDb }'
  sed -i "s/import { db }/import { getDb }/g" "$file"
  # Replace 'import { db, findUser }'
  sed -i "s/import { db, findUser }/import { getDb, findUser }/g" "$file"
  # Replace 'import { db, findShift }'
  sed -i "s/import { db, findShift }/import { getDb, findShift }/g" "$file"
  
  # Inject 'const db = await getDb()' if it imports getDb
  if grep -q "getDb" "$file"; then
    if ! grep -q "await getDb()" "$file"; then
      # Add const db = await getDb() after redirect('/login') or the start of the component
      # Find the line with redirect('/login')
      sed -i "s/redirect('\/login')/redirect('\/login')\n\n  const db = await getDb()/g" "$file"
    fi
  fi
done
