// client/src/components/OrganizationChart.js
import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaUserTie, FaUser, FaUndo, FaInfoCircle } from 'react-icons/fa';
import './OrganizationChart.css';

// Custom Node Component for Department
const DepartmentNode = ({ data }) => {
  return (
    <div className="org-chart-node dept-node" style={{ borderColor: data.color }}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" style={{ background: data.color }}>
        <div className="node-icon">{data.icon}</div>
        <div className="node-title">{data.label}</div>
      </div>
      <div className="node-body">
        <div className="node-stat">👥 {data.staff} nhân sự</div>
        {data.managers > 0 && (
          <div className="node-stat">👔 {data.managers} quản lý</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom Node for Admin
const AdminNode = ({ data }) => {
  return (
    <div className="org-chart-node admin-node" style={{ borderColor: '#FF9800' }}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" style={{ background: '#FF9800' }}>
        <div className="node-icon"><FaUserTie /></div>
        <div className="node-title">Ban Giám Đốc</div>
      </div>
      <div className="node-body">
        <div className="node-name">{data.name || 'Administrator'}</div>
        {data.code && <div className="node-code">{data.code}</div>}
        {data.departmentName && (
          <div className="node-dept-label">{data.departmentName}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom Node for Manager
const ManagerNode = ({ data }) => {
  return (
    <div className="org-chart-node manager-node" style={{ borderColor: data.color }}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" style={{ background: data.color }}>
        <div className="node-icon"><FaUserTie /></div>
        <div className="node-title">Trưởng phòng</div>
      </div>
      <div className="node-body">
        <div className="node-name">{data.name}</div>
        <div className="node-code">{data.code}</div>
        {data.departmentName && (
          <div className="node-dept-label">{data.departmentName}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Custom Node for Staff
const StaffNode = ({ data }) => {
  return (
    <div className="org-chart-node staff-node" style={{ borderColor: '#9E9E9E' }}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header" style={{ background: '#9E9E9E' }}>
        <div className="node-icon"><FaUser /></div>
        <div className="node-title">Nhân viên</div>
      </div>
      <div className="node-body">
        <div className="node-name">{data.name}</div>
        <div className="node-code">{data.code}</div>
        {data.departmentName && (
          <div className="node-dept-label">{data.departmentName}</div>
        )}
      </div>
    </div>
  );
};

// Remove Legend Component - will show inline instead

const nodeTypes = {
  department: DepartmentNode,
  admin: AdminNode,
  manager: ManagerNode,
  staff: StaffNode,
};

const OrganizationChart = ({ departmentStats, DEPARTMENTS, onSelectDepartment, staffByDepartment, showDetail = false, onSelectStaff, adminUsers = [], departmentColors = {} }) => {
  const [viewMode, setViewMode] = useState(showDetail ? 'detail' : 'overview');

  // Function to create department overview layout (horizontal line)
  const createDepartmentLayout = useCallback(() => {
    const nodes = [];
    const edges = [];

    // Add admin users - dynamically center based on count
    const adminCount = adminUsers.length || 1;
    const adminSpacing = 150; // Space between admin nodes
    const adminTotalWidth = (adminCount - 1) * adminSpacing;
    const adminStartX = 400 - adminTotalWidth / 2; // Center admins
    
    adminUsers.forEach((admin, index) => {
      const adminId = `admin-${admin.id}`;
      nodes.push({
        id: adminId,
        type: 'admin',
        position: { x: adminStartX + index * adminSpacing, y: 50 },
        data: { 
          name: admin.full_name || admin.username,
          code: admin.username || `ADMIN${index + 1}`,
          userId: admin.id,
          departmentCode: 'BGD',
          departmentName: 'Ban Giám Đốc',
          staffId: admin.id,
        },
        draggable: true,
      });
    });

    const startX = 100;
    const spacing = 250;

    departmentStats.forEach((dept, index) => {
      const deptInfo = DEPARTMENTS[dept.code];
      const x = startX + index * spacing;
      const y = 250;

      nodes.push({
        id: dept.code,
        type: 'department',
        position: { x, y },
        data: {
          label: deptInfo?.name || dept.code,
          icon: deptInfo?.icon,
          color: departmentColors[dept.code] || '#4CAF50',
          staff: dept.total_staff,
          managers: dept.managers,
          code: dept.code,
        },
        draggable: true,
      });

      // Connect admin users to departments
      adminUsers.forEach(admin => {
        edges.push({
          id: `admin-${admin.id}-${dept.code}`,
          source: `admin-${admin.id}`,
          target: dept.code,
          type: 'smoothstep',
          animated: true,
          style: { stroke: deptInfo?.color || '#4CAF50', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: deptInfo?.color || '#4CAF50',
          },
        });
      });
    });

    return { nodes, edges };
  }, [departmentStats, DEPARTMENTS, adminUsers]);

  // Function to create detailed organization chart
  const createDetailedLayout = useCallback(() => {
    const nodes = [];
    const detailEdges = [];

    // Add admin users - dynamically center and space based on count
    const adminCount = adminUsers.length || 1;
    const adminSpacing = 150; // Space between admin nodes
    const adminTotalWidth = (adminCount - 1) * adminSpacing;
    const adminStartX = 600 - adminTotalWidth / 2; // Center admins
    
    adminUsers.forEach((admin, index) => {
      const adminId = `admin-${admin.id}`;
      nodes.push({
        id: adminId,
        type: 'admin',
        position: { x: adminStartX + index * adminSpacing, y: 50 },
        data: { 
          name: admin.full_name || admin.username,
          code: admin.username || `ADMIN${index + 1}`,
          userId: admin.id,
          departmentCode: 'BGD',
          departmentName: 'Ban Giám Đốc',
          staffId: admin.id,
        },
        draggable: true,
      });
    });

    let currentX = 50;
    const deptSpacing = 300;
    const managerY = 250;
    const staffY = 450;
    const nodeSpacing = 180;

    departmentStats.forEach((dept, deptIndex) => {
      const deptInfo = DEPARTMENTS[dept.code];
      const deptStaff = staffByDepartment?.[dept.code] || [];
      const managers = deptStaff.filter(s => s.rank === 'manager');
      const staff = deptStaff.filter(s => s.rank === 'staff');

      // Add manager nodes
      managers.forEach((manager, managerIndex) => {
        const managerId = `manager-${manager.id}`;
        const x = currentX + managerIndex * nodeSpacing;

        nodes.push({
          id: managerId,
          type: 'manager',
          position: { x, y: managerY },
          data: {
            name: manager.User?.full_name || manager.username,
            code: manager.code,
            color: departmentColors[dept.code] || '#4CAF50',
            departmentCode: dept.code,
            departmentName: deptInfo?.name,
            staffId: manager.id,
          },
          draggable: true,
        });

        // Connect ALL admin users to this manager
        adminUsers.forEach(admin => {
          detailEdges.push({
            id: `admin-${admin.id}-${managerId}`,
            source: `admin-${admin.id}`,
            target: managerId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: departmentColors[dept.code] || '#4CAF50', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: departmentColors[dept.code] || '#4CAF50',
            },
          });
        });

        // Add staff under this manager
        const managerStaff = staff.slice(managerIndex * Math.ceil(staff.length / managers.length), 
                                         (managerIndex + 1) * Math.ceil(staff.length / managers.length));
        
        managerStaff.forEach((staffMember, staffIndex) => {
          const staffId = `staff-${staffMember.id}`;
          const staffX = x + (staffIndex - Math.floor(managerStaff.length / 2)) * 150;

          nodes.push({
            id: staffId,
            type: 'staff',
            position: { x: staffX, y: staffY },
            data: {
              name: staffMember.User?.full_name || staffMember.username,
              code: staffMember.code,
              departmentCode: dept.code,
              departmentName: deptInfo?.name,
              staffId: staffMember.id,
            },
            draggable: true,
          });

          // Edge from manager to staff
          detailEdges.push({
            id: `${managerId}-${staffId}`,
            source: managerId,
            target: staffId,
            type: 'smoothstep',
            style: { stroke: '#9E9E9E', strokeWidth: 1.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#9E9E9E',
            },
          });
        });
      });

      // If no managers, connect staff directly to admin
      if (managers.length === 0 && staff.length > 0) {
        const firstAdminId = adminUsers.length > 0 ? `admin-${adminUsers[0].id}` : 'admin';
        staff.forEach((staffMember, staffIndex) => {
          const staffId = `staff-${staffMember.id}`;
          const x = currentX + staffIndex * nodeSpacing;

          nodes.push({
            id: staffId,
            type: 'staff',
            position: { x, y: managerY },
            data: {
              name: staffMember.User?.full_name || staffMember.username,
              code: staffMember.code,
              departmentCode: dept.code,
              departmentName: deptInfo?.name,
              staffId: staffMember.id,
            },
            draggable: true,
          });

          detailEdges.push({
            id: `admin-${staffId}`,
            source: firstAdminId,
            target: staffId,
            type: 'smoothstep',
            style: { stroke: deptInfo?.color || '#4CAF50', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: deptInfo?.color || '#4CAF50',
            },
          });
        });
      }

      currentX += Math.max(managers.length, 1) * nodeSpacing + deptSpacing;
    });

    return { nodes, edges: detailEdges };
  }, [departmentStats, DEPARTMENTS, staffByDepartment, adminUsers]);

  const initialLayout = useMemo(() => {
    return viewMode === 'detail' ? createDetailedLayout() : createDepartmentLayout();
  }, [viewMode, createDetailedLayout, createDepartmentLayout]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  const onNodeClick = useCallback(
    (event, node) => {
      // If clicking on a staff/manager/admin node with department and staffId
      if (node.data?.departmentCode && node.data?.staffId && onSelectStaff) {
        // Admin nodes (BGD): navigate to BGD tab AND select that admin
        if (node.data.departmentCode === 'BGD') {
          onSelectStaff('BGD', node.data.staffId);
          return;
        }
        onSelectStaff(node.data.departmentCode, node.data.staffId);
      }
      // If clicking on a department node (has code but no staffId)
      else if (node.data?.code && !node.data?.staffId && onSelectDepartment) {
        onSelectDepartment(node.data.code);
      }
    },
    [onSelectDepartment, onSelectStaff]
  );

  const handleReset = useCallback(() => {
    const layout = viewMode === 'detail' ? createDetailedLayout() : createDepartmentLayout();
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [viewMode, createDetailedLayout, createDepartmentLayout, setNodes, setEdges]);

  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === 'detail' ? 'overview' : 'detail';
    setViewMode(newMode);
    const layout = newMode === 'detail' ? createDetailedLayout() : createDepartmentLayout();
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [viewMode, createDetailedLayout, createDepartmentLayout, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px' }}>
        <button 
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <FaUndo /> Reset vị trí
        </button>
        <button 
          onClick={toggleViewMode}
          style={{
            padding: '8px 16px',
            background: viewMode === 'detail' ? '#FF9800' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {viewMode === 'detail' ? 'Xem tổng quan' : 'Xem chi tiết'}
        </button>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'admin') return '#FF9800';
            if (node.type === 'manager') return node.data?.color || '#4CAF50';
            if (node.type === 'staff') return '#9E9E9E';
            return node.data?.color || '#4CAF50';
          }}
          nodeStrokeWidth={3}
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default OrganizationChart;
