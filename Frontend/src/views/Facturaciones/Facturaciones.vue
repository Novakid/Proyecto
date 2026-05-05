<template>
    <div class="col-md-12 mb-3 container-fluid p-4">
        <!-- HEADER -->
        <div class="d-flex justify-content-between align-items-center">
            <h4 class="mb-0">Gestión de facturas</h4>
            <div class="d-flex gap-4 small">
                <span>Facturas hoy: <strong class="text-success">3</strong></span>
                <span>Por timbrar: <strong class="text-warning">1</strong></span>
            </div>
        </div>
        <div class="card mt-3 shadow-sm border-0">
            <div class="card-body">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Folio</label>
                        <input type="text" class="form-control form-control-sm" placeholder="Folio: XXX-XXX-XXX..">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Desde</label>
                        <input type="date" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Hasta</label>
                        <input type="date" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Monto</label>
                        <input type="text" class="form-control form-control-sm" placeholder="$ 100.00">
                    </div>
                </div>
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Nombre del Cliente</label>
                        <input type="text" class="form-control form-control-sm" placeholder="Ricardo..">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Estatus</label>
                        <select type="date" class="form-control form-control-sm" name="" id="">
                            <option value="">Seleccione una opción</option>
                            <option value="Timbrado">Timbrado</option>
                            <option value="Pendiente">Pendiente</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-primary btn-sm w-100">
                            Filtrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <!-- TABLA -->
        <div class="mt-3">
            <table class="table table-hover align-middle custom-table">
                <thead class="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Fecha de emisión</th>
                        <th>Monto</th>
                        <th>Estatus</th>
                        <th class="text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>Manuel</td>
                        <td>20/04/2026</td>
                        <td>$100</td>
                        <td>
                            <span class="badge bg-warning text-dark">Pendiente</span>
                        </td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-sm btn-outline-success" title="Timbrar">
                                <i class="bi bi-bell"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" title="Ver PDF">
                                <i class="bi bi-file-earmark-pdf"></i>
                                </button>
                                <div class="dropdown">
                                    <button 
                                        class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                        data-bs-toggle="dropdown"
                                    >
                                    <i class="bi bi-justify"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                        <a class="dropdown-item" href="#">
                                            <i class="bi bi-pencil me-2"></i> Editar
                                        </a>
                                        </li>
                                        <li>
                                        <a class="dropdown-item text-danger" href="#">
                                            <i class="bi bi-x-circle me-2"></i> Cancelar
                                        </a>
                                        </li>
                                        <li>
                                        <a class="dropdown-item" href="#">
                                            <i class="bi bi-eye me-2"></i> Detalles
                                        </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>Jose</td>
                        <td>20/04/2026</td>
                        <td>$500</td>
                        <td>
                        <span class="badge bg-success">Timbrado</span>
                        </td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-sm btn-outline-success" title="Timbrar">
                                <i class="bi bi-bell"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" title="Ver PDF">
                                <i class="bi bi-file-earmark-pdf"></i>
                                </button>
                                <div class="dropdown">
                                    <button 
                                        class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                        data-bs-toggle="dropdown"
                                    >
                                    <i class="bi bi-justify"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                        <a class="dropdown-item" href="#">
                                            <i class="bi bi-pencil me-2"></i> Editar
                                        </a>
                                        </li>
                                        <li>
                                        <a class="dropdown-item text-danger" href="#">
                                            <i class="bi bi-x-circle me-2"></i> Cancelar
                                        </a>
                                        </li>
                                        <li>
                                        <a class="dropdown-item" href="#">
                                            <i class="bi bi-eye me-2"></i> Detalles
                                        </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>Pepe</td>
                        <td>21/04/2026</td>
                        <td>$800</td>
                        <td>
                            <span class="badge bg-success">Timbrado</span>
                        </td>
                        <td class="text-center">
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-sm btn-outline-success" title="Timbrar">
                                <i class="bi bi-bell"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" title="Ver PDF">
                                <i class="bi bi-file-earmark-pdf"></i>
                                </button>
                                <div class="dropdown">
                                    <button 
                                        class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                        data-bs-toggle="dropdown"
                                    >
                                    <i class="bi bi-justify"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                        <a class="dropdown-item" href="#">
                                            <i class="bi bi-pencil me-2"></i> Editar
                                        </a>
                                        </li>
                                        <li>
                                        <a class="dropdown-item text-danger" href="#">
                                            <i class="bi bi-x-circle me-2"></i> Cancelar
                                        </a>
                                        </li>
                                        <li>
                                        <a class="dropdown-item" href="#">
                                            <i class="bi bi-eye me-2"></i> Detalles
                                        </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
<style>
.table td, .table th {
  vertical-align: middle;
}

.dropdown-toggle::after {
  display: none;
}

.table tbody tr:hover {
  background-color: #f1f5f9;
  cursor: pointer;
}
</style>