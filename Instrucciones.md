


Para hacer este ejercicio, primero partí de la caja que aprendí a hacer con
el vídeo de clase.

Pensé que necesitaría 3*3*3 = 27 cubos, 



Hay 3 tipos de cubos:
- Los de las esquinas, que tienen 3 caras visibles
- Los que están entre dos esquinas, que tienen 2 caras visibles
- Los centros, que tienen 1 cara visible


Convertir el cubo en una esfera


Para updatear la posición se puede hacer usando "Estados"
Por ejemplo un cubo en las coord x,y,z => (-1,-1,1) , 
si se rotase en el eje X hacia la derecha obtendríamos las coordenadas
x,y,z => (1, -1, 1)
x,y,z => (1, 1, 1)
x,y,z => (-1, 1, 1)
x,y,z => (-1, -1, 1) Aquí volveríamos al estado inicial
Podríamos simplemente definir un switch con los estados, para que si se encuentra en uno
vaya al siguiente.

Otra solución más simple creo que es definiendo una lista de todos los cubos
de la layer que se quiera rotar y "correrlos" 2 espacios en el sentido de rotación.
Por ejemplo:
Queremos rotar los cubos de la layer superior (U) en el sentido del reloj.
Guardamos los cubos que conforman la layer U en una lista tal que:
U[0] = (-1,-1,1)
U[1] = (0,-1,1)
U[2] = (1,-1,1)
U[3] = (1,0,1)
U[4] = (1,1,1)
U[5] = (0,1,1)
U[6] = (-1,1,1)
U[7] = (-1,0,1)

Si rotásemos la layer U, bastaría con que U[i] = U[i-2] mod 8
