package com.example.payroll;

import org.springframework.data.repository.PagingAndSortingRepository;

/**
 * Created by ghilios on 12/25/15.
 */
public interface EmployeeRepository extends PagingAndSortingRepository<Employee, Long> {
}
