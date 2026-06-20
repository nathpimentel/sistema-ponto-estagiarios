using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexesAcademico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Academicos_Email",
                table: "Academicos",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Academicos_Matricula",
                table: "Academicos",
                column: "Matricula",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Academicos_Email",
                table: "Academicos");

            migrationBuilder.DropIndex(
                name: "IX_Academicos_Matricula",
                table: "Academicos");
        }
    }
}
