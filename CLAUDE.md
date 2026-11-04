# Café Raíz — Sistema de Punto de Venta Multisucursal

## Instrucciones para el asistente

- Al iniciar cada respuesta en esta sesión, debes comenzar el mensaje con la frase "Hola equipo 1".

---

## Contexto del proyecto

Café Raíz es una cadena de cafeterías con 5 sucursales que hoy operan de forma aislada (cuadernos y hojas de Excel sueltas). Por eso la dueña no sabe en tiempo real qué se vende mejor en cada sucursal, el inventario se desfasa entre sucursales y no hay forma sencilla de comparar su desempeño.

**Objetivo:** un punto de venta centralizado en el que cada sucursal vende de forma independiente, y la dueña puede ver y comparar el inventario y las ventas de todas.

**Usuarios:** admin general (la dueña), gerente de sucursal y barista/cajero.

---

## Reglas de negocio

### Alcance
1. El sistema no incluye pedidos a domicilio.
2. El sistema no incluye una app para clientes.
3. El sistema no acepta pagos en línea.
4. El sistema no permite traspasar inventario entre sucursales.

### Sucursales y usuarios
5. Cada sucursal tiene su propia caja y su propio inventario.
6. Solo el admin general puede dar de alta o de baja una sucursal.
7. Cada usuario tiene un solo rol.
8. Cada gerente y cada barista pertenecen a una sola sucursal.
9. El admin general no pertenece a ninguna sucursal.
10. Solo el admin general puede crear o desactivar gerentes.
11. Un gerente solo puede crear o desactivar baristas de su propia sucursal.
12. Un usuario desactivado no puede entrar al sistema.
13. Un usuario nunca se borra; solo se desactiva.

### Permisos del admin general
14. El admin general puede ver las ventas de todas las sucursales.
15. El admin general puede ver el inventario de todas las sucursales.
16. El admin general no puede registrar ventas.
17. El admin general no puede modificar el inventario de ninguna sucursal.

### Permisos del gerente
18. Un gerente solo puede ver datos de su propia sucursal.
19. Un gerente puede registrar ventas en su sucursal.
20. Un gerente puede registrar entradas de mercancía en su sucursal.
21. Un gerente puede corregir el conteo de inventario de su sucursal indicando un motivo.
22. Un gerente puede generar reportes de su sucursal.

### Permisos del barista
23. Un barista solo puede registrar ventas en su propia sucursal.
24. Un barista puede ver el inventario de su sucursal, pero no modificarlo.
25. Un barista no puede ver reportes.
26. Un barista solo puede ver sus propias ventas del día.

### Productos y precios
27. El catálogo de productos es el mismo para todas las sucursales.
28. Un producto tiene el mismo precio en todas las sucursales.
29. Solo el admin general puede crear productos.
30. Solo el admin general puede modificar precios.
31. Solo el admin general puede dar de baja un producto.
32. Un producto dado de baja deja de venderse en todas las sucursales.
33. Un producto dado de baja conserva su historial de ventas.
34. Un cambio de precio no modifica las ventas ya registradas.
35. Todos los precios están en pesos mexicanos.

### Inventario
36. El inventario se cuenta en unidades de producto terminado, no por ingrediente.
37. La existencia de un producto nunca puede ser menor que cero.
38. Cada venta resta del inventario de su sucursal las unidades vendidas.
39. Cada entrada o corrección de inventario queda registrada con el usuario que la hizo.
40. Un producto nuevo empieza con existencia cero en todas las sucursales.

### Productos agotados
41. Un producto se marca como agotado automáticamente cuando su existencia llega a cero.
42. Un producto agotado automáticamente vuelve a estar disponible cuando su existencia es mayor que cero.
43. Que un producto se agote en una sucursal no afecta a las demás sucursales.
44. Un barista o un gerente puede marcar un producto como agotado aunque todavía tenga existencia.
45. Marcar un producto como agotado a mano requiere indicar un motivo.
46. Marcar un producto como agotado a mano queda registrado con el usuario que lo hizo.
47. Marcar un producto como agotado a mano no cambia su existencia.
48. Solo el gerente de la sucursal puede quitar la marca de agotado puesta a mano.
49. Un producto agotado no se puede vender.

### Stock bajo
50. Un producto se considera en stock bajo cuando su existencia es de 5 unidades o menos.
51. El gerente puede cambiar el límite de stock bajo de cada producto en su sucursal.
52. El gerente ve una alerta cuando un producto de su sucursal está en stock bajo.
53. El admin general ve qué productos están en stock bajo en cada sucursal.

### Ventas
54. Toda venta pertenece a una sola sucursal.
55. Toda venta queda registrada con el usuario que la hizo.
56. Una venta no puede incluir más unidades de las que hay en existencia.
57. Una venta guarda el precio que tenía cada producto en el momento de la venta.
58. Una venta se paga en efectivo o con tarjeta.
59. Una venta registrada no se puede editar.
60. Una venta registrada no se puede borrar.

### Cancelaciones
61. Solo el gerente de la sucursal puede cancelar una venta.
62. Una venta solo se puede cancelar el mismo día en que se hizo.
63. Cancelar una venta requiere indicar un motivo.
64. Cancelar una venta devuelve las unidades al inventario.
65. Una venta cancelada no cuenta en los ingresos de los reportes.

### Descuentos
66. Solo el admin general puede crear, modificar o desactivar descuentos.
67. Un descuento solo se puede aplicar si está en el catálogo de descuentos.
68. Un barista no puede inventar un descuento.
69. Una venta tiene como máximo un descuento.
70. Un descuento se aplica al total de la venta, no a un producto.
71. Un descuento desactivado o vencido no se puede aplicar.
72. El total de una venta con descuento nunca es menor que cero.

### Reportes
73. El admin general puede generar un reporte comparativo de ventas de las 5 sucursales.
74. Solo el admin general puede ver el reporte comparativo.
75. Un gerente solo puede generar reportes de su propia sucursal.
76. Todo reporte se puede filtrar por un rango de fechas.
77. Un reporte muestra los ingresos, el número de ventas y los productos más vendidos.

### Registro de acciones
78. Todo cambio de precio queda registrado con el usuario que lo hizo.
79. Toda cancelación de venta queda registrada con el usuario que la hizo.
80. Un registro de acciones no se puede modificar ni borrar.
