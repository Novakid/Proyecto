<template>
  <div class="container-fluid p-4">
    <!-- 🔹 CARDS SUPERIORES -->
    <div class="row mb-4">
      <!-- Ventas de hoy -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h6 class="text-muted">Ventas de hoy</h6>
            <h3 class="fw-bold text-success">$12,450</h3>
          </div>
        </div>
      </div>
      <!-- Facturas emitidas -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h6 class="text-muted">Facturas emitidas</h6>
            <h3 class="fw-bold text-primary">32</h3>
          </div>
        </div>
      </div>
      <!-- Pedidos pendientes -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h6 class="text-muted">Pedidos pendientes</h6>
            <h3 class="fw-bold text-warning">8</h3>
          </div>
        </div>
      </div>
    </div>
    <!-- 🔹 SECCIÓN INFERIOR -->
    <div class="row">
      <!-- Tabla pedidos pendientes -->
      <div class="col-md-8">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h5 class="mb-3">Pedidos pendientes</h5>
            <div class="table-responsive scroll-box">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>#001</td>
                    <td>Juan Pérez</td>
                    <td>2026-04-23</td>
                    <td><span class="badge bg-warning">Pendiente</span></td>
                  </tr>
                  <tr>
                    <td>#002</td>
                    <td>Maria Lopez</td>
                    <td>2026-04-22</td>
                    <td><span class="badge bg-warning">Pendiente</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <!-- Stock bajo -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h5 class="mb-3">Stock bajo</h5>
            <div class="scroll-box">
              <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between">
                  Filtro de aceite
                  <span class="badge bg-danger">3</span>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  Bujías
                  <span class="badge bg-danger">5</span>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  Pastillas de freno
                  <span class="badge bg-danger">2</span>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  Pastillas de freno
                  <span class="badge bg-danger">2</span>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  Pastillas de freno
                  <span class="badge bg-danger">2</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>